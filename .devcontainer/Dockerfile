# Note: Official Microsoft Dev Container base images already bakes a script
# equivalent to ghcr.io/devcontainers/features/common-utils feature directly
# into their images to ensure a standardized experience.
FROM mcr.microsoft.com/devcontainers/typescript-node:24-trixie

# Set noninteractive package installation
ARG DEBIAN_FRONTEND=noninteractive 

# Update packages list
RUN sudo apt update

# Install common utilities not provided in the base image
RUN sudo apt install --no-install-recommends -y vim tmux