let audioContext;
let recorder;
let audioBlob;
let audioURL;

const startButton = document.getElementById("startRecording");
const stopButton = document.getElementById("stopRecording");
const uploadButton = document.getElementById("uploadAudioo");
const audioPlayback = document.getElementById("audioPlayback");

startButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
uploadButton.addEventListener("click", UploadAudioLive);

async function startRecording() {

    // let recordIndicator = document.getElementById("startRecording"); // Ensure this element exists

    // Add blinking effect
    startButton.classList.add("recording");
    stopButton.classList.add('stop-blink')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const input = audioContext.createMediaStreamSource(stream);
    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
        audioBlob = e.data;
        audioURL = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioURL;
        uploadButton.disabled = false;
    };

    recorder.start();
    startButton.disabled = true;
    stopButton.disabled = false;
}

function stopRecording() {
    startButton.classList.remove("recording");
    stopButton.classList.remove('stop-blink')
    recorder.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
}

async function convertToMP3(wavBlob) {
    const arrayBuffer = await wavBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    const samples = floatTo16BitPCM(channelData);
    const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3Data = [];
    let blockSize = 1152;
    for (let i = 0; i < samples.length; i += blockSize) {
        let sampleChunk = samples.subarray(i, i + blockSize);
        let mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const finalBuffer = mp3Encoder.flush();
    if (finalBuffer.length > 0) {
        mp3Data.push(finalBuffer);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
}

function floatTo16BitPCM(floatSamples) {
    let output = new Int16Array(floatSamples.length);
    for (let i = 0; i < floatSamples.length; i++) {
        let s = Math.max(-1, Math.min(1, floatSamples[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
}

async function UploadAudioLive() {
    if (!audioBlob) {
        alert("No audio recorded!");
        return;
    }

    // Convert to MP3
    const mp3Blob = await convertToMP3(audioBlob);
    const formData = new FormData();
    formData.append("audio", mp3Blob, "recorded_audio.mp3");

    fetch("/upload-audio", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        document.querySelector(".prediction1").style.display = "block";
        document.getElementById("result1").textContent = data.predicted_emotion || "Unknown";
    })
    .catch(error => console.error("Error:", error));
}

function turnOnCamera() {
    const cameraContainer = document.getElementById("cameraContainer");
    const errorMessage = document.getElementById("error-message");

    // Clear the uploaded video if any
    fetch("/clear-uploaded-video", { method: "POST" })  
        .then(() => {
            fetch("/start-video-live", { method: "POST" })
                .then(response => {
                    if (response.ok) {
                        console.log("Camera started successfully.");
                        errorMessage.innerHTML = "";
                        cameraContainer.style.display = "block";

                        let cameraFeed = cameraContainer.querySelector("img");
                        if (!cameraFeed) {
                            cameraFeed = document.createElement("img");
                            cameraContainer.appendChild(cameraFeed);
                        }

                        cameraFeed.src = `/video-stream-live?time=${new Date().getTime()}`;
                        cameraFeed.style.maxWidth = "100%";
                    } else {
                        console.error("Failed to start camera:", response.statusText);
                        errorMessage.innerHTML = `<p style="color: red;">${response.statusText}</p>`;
                    }
                })
                .catch(error => {
                    console.error("Error while starting the camera:", error);
                    errorMessage.innerHTML = `<p style="color: red;">Error starting camera. Please try again.</p>`;
                });
        });
}   
   
        function uploadAudio() {
            let fileInput = document.getElementById("audioFile");
            let file = fileInput.files[0];
           console.log(file)
            if (!file) {
                alert("Please select an audio file first.");
                return;
            }

            let formData = new FormData();
            formData.append("audio", file);

            fetch("/upload-audio", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log("hello from backend ")
                document.getElementById("result").innerText = data.predicted_emotion;
                document.querySelector(".prediction").style.display = "block";
            })
            .catch(error => console.error("Error:", error));
        }

      
        document.getElementById("uploadForm").onsubmit = async function(event) {
            event.preventDefault();
            let formData = new FormData();
            formData.append("file", document.getElementById("videoFile").files[0]);

            let response = await fetch("/upload-video", { method: "POST", body: formData });
            let result = await response.text();
            alert(result);

            if (response.ok) {
                let videoStream = document.getElementById("videoStream");
        videoStream.style.display = "block"; // Show the stream
        videoStream.src = "/video-stream?" + new Date().getTime(); // Update the video stream source
    }   
            };
        
        async function stopVideo() {
            let response = await fetch("/stop-video", { method: "POST" });
            let result = await response.text();
            
            document.getElementById("videoStream").style.display = "none"; // Hide video stream
            alert(result);
        }
        async function turnOffCamera() {
            let response = await fetch("/stop-video-live", { method: "POST" });
            let result = await response.text();
            
            // Hide the camera container when turning off
            const cameraContainer = document.getElementById("cameraContainer");
            cameraContainer.style.display = "none";
        
            // Optional: Clear the image element to reset the feed
            let cameraFeed = cameraContainer.querySelector("img");
            if (cameraFeed) {
                cameraFeed.src = "";  // Stop the current feed
                cameraContainer.removeChild(cameraFeed);  // Remove the image element if needed
            }
        
            console.log("Camera turned off successfully.");
        }