# Action Required: Comic Editor Improvements

Manual steps that must be completed by a human. These cannot be automated.

## Before Implementation

- [ ] **Review API quota limits** - Verify Gemini Vision API quota is sufficient for text detection feature (detectTextBoxes calls count toward API limits)
- [ ] **Test on target devices** - Ensure touch/tablet devices are available for testing drawing tool interactions

## During Implementation

None - all implementation steps can be completed programmatically.

## After Implementation

- [ ] **Test text detection accuracy** - Manually verify OCR detection works on various panel styles and text qualities
- [ ] **Test keyboard shortcuts** - Verify all shortcuts work on different operating systems (Windows, Mac, Linux)
- [ ] **Test export quality** - Manually verify PDF export includes drawings and bubbles correctly
- [ ] **Performance testing** - Test drawing tool performance on lower-end devices to ensure 60fps is maintained
- [ ] **Mobile testing** - Test touch interactions on actual mobile/tablet devices

---

> **Note:** These tasks are also listed in context within `implementation-plan.md`
