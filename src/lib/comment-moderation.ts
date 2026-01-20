// List of inappropriate words to censor
// This is a basic profanity filter that can be extended
const INAPPROPRIATE_WORDS = [
  // Strong profanity
  'fuck', 'shit', 'damn', 'bitch', 'bastard', 'ass', 'asshole',
  'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut',

  // Derogatory terms
  'nigger', 'nigga', 'fag', 'faggot', 'retard', 'retarded',

  // Violence and threats
  'kill', 'murder', 'rape', 'terrorist', 'bomb',

  // Extended inappropriate terms
  'porn', 'xxx', 'sex', 'nude', 'naked',
];

/**
 * Check if content contains inappropriate words
 */
export function containsInappropriateContent(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return INAPPROPRIATE_WORDS.some(word =>
    lowerContent.includes(word.toLowerCase())
  );
}

/**
 * Censor inappropriate words in content
 * Replaces inappropriate words with asterisks
 */
export function censorContent(content: string): string {
  let censored = content;

  for (const word of INAPPROPRIATE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censored = censored.replace(regex, (match) => '*'.repeat(match.length));
  }

  return censored;
}

/**
 * Moderate comment content
 * Returns object with moderation status and censored content
 */
export function moderateComment(content: string): {
  isCensored: boolean;
  censoredContent: string;
} {
  const censoredContent = censorContent(content);
  const isCensored = censoredContent !== content;

  return {
    isCensored,
    censoredContent: isCensored ? censoredContent : content,
  };
}

/**
 * Get display content for a comment
 * Returns the censored version if the comment is flagged, otherwise original
 */
export function getDisplayContent(
  content: string,
  isCensored: boolean,
  censoredContent?: string | null
): string {
  if (isCensored && censoredContent) {
    return censoredContent;
  }
  return content;
}
