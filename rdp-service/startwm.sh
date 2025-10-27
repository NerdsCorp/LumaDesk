#!/bin/sh
# xrdp session startup script

DESKTOP="${DESKTOP_ENVIRONMENT:-xfce}"

# Source system profile
if [ -f /etc/profile ]; then
    . /etc/profile
fi

# Source user profile
if [ -f ~/.profile ]; then
    . ~/.profile
fi

# Start desktop session based on environment
case "$DESKTOP" in
  kde)
    exec startplasma-x11
    ;;
  gnome)
    export XDG_CURRENT_DESKTOP=GNOME
    export GNOME_SHELL_SESSION_MODE=ubuntu
    exec gnome-session
    ;;
  xfce|*)
    exec startxfce4
    ;;
esac
