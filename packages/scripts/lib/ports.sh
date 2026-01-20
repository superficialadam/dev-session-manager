#!/usr/bin/env bash
# ports.sh - Port allocation utilities for dev sessions
#
# Port ranges:
#   3000-5999: User services (dashboard, API, etc.)
#   6100-6199: Nvim servers
#   4100-4199: OpenCode servers
#   7700-7799: ttyd terminals

# Service port range
SERVICE_PORT_MIN=3000
SERVICE_PORT_MAX=5999

# Check if a port is in use
is_port_in_use() {
    local port=$1
    ss -tlnp 2>/dev/null | grep -q ":$port " && return 0
    return 1
}

# Find next available port in range
find_available_port() {
    local min=$1
    local max=$2
    for port in $(seq "$min" "$max"); do
        if ! is_port_in_use "$port"; then
            echo "$port"
            return 0
        fi
    done
    return 1
}

# Get all allocated ports from all active sessions
get_allocated_service_ports() {
    local sessions_dir="${SESSIONS_DIR:-$HOME/.dev-sessions/sessions}"
    local ports=()
    
    if [[ -d "$sessions_dir" ]]; then
        for session_dir in "$sessions_dir"/*/; do
            local services_file="$session_dir/services.json"
            if [[ -f "$services_file" ]]; then
                # Extract all port values from services.json
                while IFS= read -r port; do
                    [[ -n "$port" && "$port" != "null" ]] && ports+=("$port")
                done < <(jq -r '.services[].port // empty' "$services_file" 2>/dev/null)
            fi
        done
    fi
    
    printf '%s\n' "${ports[@]}" | sort -n | uniq
}

# Allocate a unique port for a service
# Usage: allocate_service_port [preferred_port]
# Returns: An available port number, or empty on failure
allocate_service_port() {
    local preferred=${1:-}
    local allocated_ports
    allocated_ports=$(get_allocated_service_ports)
    
    # If preferred port specified and available, use it
    if [[ -n "$preferred" ]]; then
        if ! is_port_in_use "$preferred" && ! echo "$allocated_ports" | grep -q "^${preferred}$"; then
            echo "$preferred"
            return 0
        fi
    fi
    
    # Find next available port not in use and not allocated
    for port in $(seq "$SERVICE_PORT_MIN" "$SERVICE_PORT_MAX"); do
        if ! is_port_in_use "$port" && ! echo "$allocated_ports" | grep -q "^${port}$"; then
            echo "$port"
            return 0
        fi
    done
    
    return 1
}

# Load services from session's services.json
# Usage: load_services <session_name>
# Sets: SERVICES_JSON variable
load_services() {
    local session_name=$1
    local sessions_dir="${SESSIONS_DIR:-$HOME/.dev-sessions/sessions}"
    local services_file="$sessions_dir/$session_name/services.json"
    
    if [[ -f "$services_file" ]]; then
        SERVICES_JSON=$(cat "$services_file")
        return 0
    fi
    
    SERVICES_JSON='{"services":[]}'
    return 1
}

# Save services to session's services.json
# Usage: save_services <session_name>
# Uses: SERVICES_JSON variable
save_services() {
    local session_name=$1
    local sessions_dir="${SESSIONS_DIR:-$HOME/.dev-sessions/sessions}"
    local session_dir="$sessions_dir/$session_name"
    local services_file="$session_dir/services.json"
    
    mkdir -p "$session_dir"
    echo "$SERVICES_JSON" > "$services_file"
}

# Add a service to SERVICES_JSON
# Usage: add_service <name> <port> <pane> <cmd> <cwd>
add_service() {
    local name=$1
    local port=$2
    local pane=$3
    local cmd=$4
    local cwd=${5:-}
    
    SERVICES_JSON=$(echo "$SERVICES_JSON" | jq \
        --arg name "$name" \
        --argjson port "$port" \
        --arg pane "$pane" \
        --arg cmd "$cmd" \
        --arg cwd "$cwd" \
        --arg status "running" \
        '.services += [{name: $name, port: $port, pane: $pane, cmd: $cmd, cwd: $cwd, status: $status}]')
}

# Get service info by name
# Usage: get_service <name>
# Returns: JSON object of the service or empty
get_service() {
    local name=$1
    echo "$SERVICES_JSON" | jq -r --arg name "$name" '.services[] | select(.name == $name)'
}

# Update service status
# Usage: update_service_status <name> <status>
update_service_status() {
    local name=$1
    local status=$2
    
    SERVICES_JSON=$(echo "$SERVICES_JSON" | jq \
        --arg name "$name" \
        --arg status "$status" \
        '(.services[] | select(.name == $name)).status = $status')
}
