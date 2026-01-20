# Action Required: Comic Making Refinements

Manual steps that must be completed by a human. These cannot be automated.

## Before Implementation

None required.

## During Implementation

None required.

## After Implementation

- [ ] **Review database migration** - Verify the migration ran successfully and all existing comics have default values for new fields
- [ ] **Test PDF export dimensions** - For each page size (Letter, A4, Tabloid, A3), create a test comic and verify the exported PDF has correct dimensions using a PDF viewer
- [ ] **Verify character consistency** - Generate a comic from an image upload with multiple panels and visually confirm character appearance is consistent across panels
- [ ] **Test all new art styles** - Create sample comics with each new art style (Noir, Watercolor, Anime, Pop Art) to ensure AI generates appropriate visuals
- [ ] **Test all new tones** - Create sample comics with each new tone (Adventure, Romantic, Horror) to ensure AI generates appropriate mood/atmosphere

---

> **Note:** These tasks are also listed in context within `implementation-plan.md`
