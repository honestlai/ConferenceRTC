# Use an Alpine-based Python image
FROM python:3.8-alpine

# Set the working directory in the container
WORKDIR /ConferenceRTC

# Install basic dependencies
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    openssl-dev

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
