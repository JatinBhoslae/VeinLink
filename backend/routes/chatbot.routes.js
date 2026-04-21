import express from 'express';
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

const BLOOD_SYSTEM_PROMPT = `You are Vein Link Blood Assistant — a friendly, expert AI chatbot for the Vein Link Blood Bank Management System. You answer questions about blood donation, blood groups, compatibility, eligibility, and the Vein Link platform.

KEY KNOWLEDGE:
- Blood Groups: A+, A-, B+, B-, AB+, AB-, O+, O-
- Universal Donor: O- (can donate to all), Universal Recipient: AB+ (can receive from all)
- Donation gap: minimum 56 days (8 weeks) for whole blood, 90 days recommended
- Age: 18-65 years old can donate
- Weight: minimum 50 kg (110 lbs)
- Cannot donate if: pregnant, recently tattooed (within 6 months), taking certain medicines, have HIV/Hepatitis, severe anemia
- One donation can save up to 3 lives
- Blood shelf life: Red cells ~42 days, Platelets ~5 days, Plasma ~1 year (frozen)

COMPATIBILITY CHART:
- O- → can donate to ALL, can receive from O- only
- O+ → can donate to O+, A+, B+, AB+, can receive from O+, O-
- A- → can donate to A-, A+, AB-, AB+, can receive from A-, O-
- A+ → can donate to A+, AB+, can receive from A+, A-, O+, O-
- B- → can donate to B-, B+, AB-, AB+, can receive from B-, O-
- B+ → can donate to B+, AB+, can receive from B+, B-, O+, O-
- AB- → can donate to AB-, AB+, can receive from A-, B-, AB-, O-
- AB+ → can donate to AB+ only, can receive from ALL

VEIN LINK FEATURES: Donor registration, hospital management, blood inventory, donation appointments, blood camps, emergency broadcast, donor dashboard with badges & rewards, QR code profiles, voice emergency requests.

RULES:
- Be concise (2-4 sentences typically)
- Use emojis sparingly for friendliness
- If asked about emergencies, direct them to the Emergency Blood Request feature
- Always encourage safe blood donation
- For medical concerns, advise consulting a doctor
- Format responses with markdown when helpful`;

// @route   POST /api/chatbot/chat
// @desc    Send message to AI chatbot using Google GenAI SDK
// @access  Public
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Chatbot service is not configured',
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Build conversation context from history
    let contextMessages = BLOOD_SYSTEM_PROMPT + '\n\n';
    if (history && Array.isArray(history)) {
      history.slice(-6).forEach((msg) => {
        contextMessages += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }
    contextMessages += `User: ${message}\nAssistant:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextMessages,
    });

    const aiMessage = response.text || 'Sorry, I could not generate a response.';

    res.json({
      success: true,
      data: {
        message: aiMessage,
      },
    });
  } catch (error) {
    console.error('Chatbot Error:', error);
    next(error);
  }
});

// @route   POST /api/chatbot/voice-parse
// @desc    Parse voice text to extract blood group for emergency
// @access  Public
router.post('/voice-parse', async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, message: 'No transcript provided' });
    }

    // Blood group patterns
    const bloodGroupPatterns = [
      { pattern: /\b(O\s*negative|O\s*-|O\s*neg)\b/i, group: 'O-' },
      { pattern: /\b(O\s*positive|O\s*\+|O\s*pos)\b/i, group: 'O+' },
      { pattern: /\b(A\s*negative|A\s*-|A\s*neg)\b/i, group: 'A-' },
      { pattern: /\b(A\s*positive|A\s*\+|A\s*pos)\b/i, group: 'A+' },
      { pattern: /\b(B\s*negative|B\s*-|B\s*neg)\b/i, group: 'B-' },
      { pattern: /\b(B\s*positive|B\s*\+|B\s*pos)\b/i, group: 'B+' },
      { pattern: /\b(AB\s*negative|AB\s*-|AB\s*neg)\b/i, group: 'AB-' },
      { pattern: /\b(AB\s*positive|AB\s*\+|AB\s*pos)\b/i, group: 'AB+' },
    ];

    let detectedGroup = null;
    for (const { pattern, group } of bloodGroupPatterns) {
      if (pattern.test(transcript)) {
        detectedGroup = group;
        break;
      }
    }

    // Detect urgency
    const urgencyWords = /\b(urgent|emergency|critical|immediately|dying|accident|asap|help)\b/i;
    const isUrgent = urgencyWords.test(transcript);

    res.json({
      success: true,
      data: {
        transcript,
        bloodGroup: detectedGroup,
        isUrgent,
        message: detectedGroup
          ? `Detected blood group: ${detectedGroup}${isUrgent ? ' (URGENT)' : ''}`
          : 'Could not detect blood group. Please say the blood group clearly (e.g., "I need O positive blood").',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
