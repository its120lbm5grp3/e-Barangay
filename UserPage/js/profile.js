import { auth, db } from '../../firebase-config.js';
import { onAuthStateChanged, signOut, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Form and input elements
const profileForm = document.querySelector('#profileForm');
const firstNameInput = document.querySelector('#firstName');
const lastNameInput = document.querySelector('#lastName');
const emailInput = document.querySelector('#email');
const blkNoInput = document.querySelector('#blkNo');
const streetInput = document.querySelector('#street');
const townInput = document.querySelector('#town');
const cityInput = document.querySelector('#city');
const zipInput = document.querySelector('#zip');
const countryInput = document.querySelector('#country');
const signOutBtn = document.querySelector('#signOutBtn');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("No user is signed in. Redirecting to login.");
    window.location.href = "../Log-Reg Page/index.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);

  // Load user Firestore data to prefill form
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      firstNameInput.value = userData.firstName || '';
      lastNameInput.value = userData.lastName || '';
      emailInput.value = userData.email || '';
      emailInput.disabled = true;

      if (userData.sex) {
        const sexRadio = document.querySelector(`input[name="sex"][value="${userData.sex}"]`);
        if (sexRadio) sexRadio.checked = true;
      }

      if (userData.address) {
        blkNoInput.value = userData.address.blkNo || '';
        streetInput.value = userData.address.street || '';
        townInput.value = userData.address.town || '';
        cityInput.value = userData.address.city || '';
        zipInput.value = userData.address.zip || '';
        countryInput.value = userData.address.country || '';
      }
    } else {
      console.error("User data not found in Firestore!");
      alert("Could not find your user data.");
    }
  } catch (err) {
    console.error("Error fetching user doc:", err);
    alert("Unable to load profile data. Check console for details.");
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedSex = document.querySelector('input[name="sex"]:checked');

    try {
      // Ensure that client-side user record and ID token are refreshed
      // so server rules that rely on email_verified or token claims will be evaluated correctly.
      try {
        // reload user record (updates user.emailVerified)
        await user.reload();
      } catch (reloadErr) {
        // non-fatal, but log
        console.warn("user.reload() failed:", reloadErr);
      }

      // Force-refresh ID token so rules see latest claims
      try {
        await user.getIdToken(true);
      } catch (tokenErr) {
        console.warn("getIdToken(true) failed:", tokenErr);
      }

      // Get token claims (optional, for debugging)
      let tokenResult;
      try {
        tokenResult = await getIdTokenResult(user);
      } catch (tErr) {
        console.warn("getIdTokenResult failed:", tErr);
      }

      const tokenEmailVerified = (tokenResult && tokenResult.claims && tokenResult.claims.email_verified) === true;
      const userEmailVerified = !!user.emailVerified;

      // If neither the user record nor token show verified, refuse with friendly message
      if (!userEmailVerified && !tokenEmailVerified) {
        alert("Please verify your email address before updating your profile. If you just verified, try signing out and signing in again.");
        return;
      }

      // Use setDoc with merge:true to avoid accidentally removing fields (safer than a full overwrite).
      await setDoc(userDocRef, {
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        sex: selectedSex ? selectedSex.value : "",
        address: {
          blkNo: blkNoInput.value,
          street: streetInput.value,
          town: townInput.value,
          city: cityInput.value,
          zip: zipInput.value,
          country: countryInput.value
        }
      }, { merge: true });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile: ", error);
      // Provide a clearer message for permission issues
      if (error.code === 'permission-denied' || /permission/i.test(error.message)) {
        alert("Failed to update profile: missing permissions. Make sure your email is verified and your Firestore rules allow this action.");
      } else {
        alert(`Failed to update profile: ${error.message}`);
      }
    }
  });

  signOutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = "../Log-Reg Page/index.html";
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  });
});
