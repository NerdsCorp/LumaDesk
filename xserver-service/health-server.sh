#!/bin/bash
# Simple HTTP health check server

PORT=6000

while true; do
  # Get system metrics
  CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
  MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
  ACTIVE_SESSIONS=$(who | wc -l)

  # HTTP response
  RESPONSE="HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
  RESPONSE+="{\"status\":\"ok\",\"metrics\":{\"cpu\":$CPU_USAGE,\"memory\":$MEM_USAGE,\"sessions\":$ACTIVE_SESSIONS}}"

  # Listen on port and respond
  echo -e "$RESPONSE" | nc -l -p $PORT -q 1 > /dev/null 2>&1
done
