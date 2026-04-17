FROM rust:1-bookworm

ARG TYPST_CLI_VERSION=0.14.2

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates \
     curl \
     fontconfig \
  && rm -rf /var/lib/apt/lists/*

# Font Awesome 6 + Roboto Slab for Typst PDFs — installed in the image, not the repo.
RUN mkdir -p /usr/local/share/fonts/resumify \
  && curl -fsSL -o /usr/local/share/fonts/resumify/fa-solid-900.otf \
    "https://github.com/FortAwesome/Font-Awesome/raw/6.x/otfs/Font%20Awesome%206%20Free-Solid-900.otf" \
  && curl -fsSL -o /usr/local/share/fonts/resumify/fa-regular-400.otf \
    "https://github.com/FortAwesome/Font-Awesome/raw/6.x/otfs/Font%20Awesome%206%20Free-Regular-400.otf" \
  && curl -fsSL -o /usr/local/share/fonts/resumify/fa-brands-400.otf \
    "https://github.com/FortAwesome/Font-Awesome/raw/6.x/otfs/Font%20Awesome%206%20Brands-Regular-400.otf" \
  && curl -fsSL -o /usr/local/share/fonts/resumify/RobotoSlab-Bold.ttf \
    "https://raw.githubusercontent.com/googlefonts/robotoslab/main/fonts/ttf/RobotoSlab-Bold.ttf" \
  && fc-cache -fv

RUN cargo install typst-cli --locked --version ${TYPST_CLI_VERSION}

ENV PATH="/root/.cargo/bin:${PATH}"
