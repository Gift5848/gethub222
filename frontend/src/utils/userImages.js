// Placeholder user images for testimonials
// Place these images in frontend/public/testimonials/
// If not found, fallback to a default avatar

export function getUserImage(filename) {
  try {
    return require(`../public/testimonials/${filename}`);
  } catch (e) {
    return require('../public/default-avatar.jpg');
  }
}
