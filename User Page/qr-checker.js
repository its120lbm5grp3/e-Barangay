import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyCJvuz01ir-0onk9LKrl2Qw9APr7nFRW28",
      authDomain: "e-barangay-396e6.firebaseapp.com",
      databaseURL: "https://e-barangay-396e6-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "e-barangay-396e6",
      storageBucket: "e-barangay-396e6.firebasestorage.app",
      messagingSenderId: "678452381421",
      appId: "1:678452381421:web:9d98261ce6131ac0bbeee4",
      measurementId: "G-W4R65QDVC5"
    };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function extractCode(data) {
  try {
    const url = new URL(data);
    const parts = url.pathname.split('/');
    return parts.pop() || parts[parts.length - 1];
  } catch {
    return data.trim();
  }
}

async function checkCode(code) {
  const resultEl = document.getElementById("result");
  const ref = doc(db, "documents", code);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      resultEl.innerHTML = `Authentic QR Code<br>
                        Name: ${data.name || "Unnamed"}<br>
                        Product: ${data.productName || "Unnamed Product"}`;
      resultEl.style.color = "green";
    } else {
      resultEl.innerHTML = "Not Authentic!";
      resultEl.style.color = "red";
    }
  } catch (error) {
    resultEl.innerHTML = "Error checking Firestore.";
    resultEl.style.color = "red";
  }
}

export async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const resultEl = document.getElementById("result");
  resultEl.innerHTML = "Scanning image...";
  resultEl.style.color = "black";

  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imageData.data, canvas.width, canvas.height);

    if (qr) {
      const code = extractCode(qr.data);
      resultEl.innerHTML = `QR Code: ${code}`;
      resultEl.style.color = "blue";
      checkCode(code);
    } else {
      resultEl.innerHTML = "No QR code found in the image.";
      resultEl.style.color = "red";
    }
  };
}

let videoStream = null;

export async function startCamera() {
  const video = document.getElementById("camera");
  const resultEl = document.getElementById("result");

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = videoStream;
    video.play();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, canvas.width, canvas.height);
        if (qr) {
          const code = extractCode(qr.data);
          resultEl.innerHTML = `QR Code: ${code}`;
          resultEl.style.color = "blue";
          checkCode(code);
          stopCamera();
          return;
        }
      }
      requestAnimationFrame(scan);
    };
    scan();
  } catch (err) {
    resultEl.innerHTML = "Cannot access camera.";
    resultEl.style.color = "red";
  }
}

export function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
  }
}

// Make functions available globally (for HTML buttons)
window.handleFileUpload = handleFileUpload;
window.startCamera = startCamera;
window.stopCamera = stopCamera;
