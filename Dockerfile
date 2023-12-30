# Use a Debian-based Python image
FROM python:3.8-slim-buster

# Set the working directory in the container
WORKDIR /ConferenceRTC

# Install dependencies required for aiortc and av
RUN apt-get update && apt-get install -y \
    net-tools \
    nano \
    figlet \
    neofetch \
    gcc \
    libc-dev \
    libffi-dev \
    openssl \
    libssl-dev \
    make \
    pkg-config \
    libopus-dev \
    ffmpeg \
    libavdevice-dev \
    libavfilter-dev \
    libavformat-dev \
    libavcodec-dev \
    libswscale-dev \
    libopusfile-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container at /ConferenceRTC
COPY . /ConferenceRTC

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define environment variable
ENV NAME ConferenceRTC

# Run app.py when the container launches
CMD ["./entrypoint.sh"]
