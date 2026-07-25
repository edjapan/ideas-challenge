import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Make the submit handler globally accessible or attach it from within
window.submitLeadToFirebase = async function(leadData) {
  try {
    const docRef = await addDoc(collection(db, "applications"), {
      ...leadData,
      status: "Step 1 Complete",
      createdAt: new Date().toISOString()
    });
    console.log("Document written with ID: ", docRef.id);
    
    // Construct the unique link based on the current domain
    const uniqueLink = `${window.location.origin}/frex-challenge/submit-idea?id=${docRef.id}`;
    
    // Send email via EmailJS
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: 'service_fgv0pwa',
        template_id: 'template_zy6mkd1',
        user_id: 'EErfqFIU4oDEsN8ww',
        template_params: {
          name: leadData.name,
          email: leadData.email,
          track: leadData.track,
          unique_link: uniqueLink
        }
      })
    });
    
    return docRef.id;
  } catch (e) {
    console.error("Error adding document or sending email: ", e);
    throw e;
  }
};
