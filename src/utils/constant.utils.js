const Roles = {
  User: 'user',
  Admin: 'admin',
};

const RolesEnum = Object.values(Roles);

export function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000);
}

export { Roles, RolesEnum };

export const socialMediaRegex = {
  facebook: /^https?:\/\/(?:(?:www|mobile|m|web)\.)?facebook\.com\/(share\/[A-Za-z]+\/[A-Za-z0-9]+\/?|watch\/?\?v=[A-Za-z0-9]+|[A-Za-z0-9.]+(?:\/posts\/[A-Za-z0-9]+)?|pages\/[A-Za-z0-9\-]+\/\d+|reel\/\d+\/?)(?:\?.*)?$|^https?:\/\/fb\.watch\/[A-Za-z0-9_-]+\/?$/,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[a-zA-Z0-9_-]+\/?(?:\?[^\s]*)?$/,
  twitter: /https:\/\/x\.com\/[a-zA-Z0-9_]+\/status\/\d+/,
  youtube: /https:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]{11}(?:\?feature=shared)?/,
  tiktok: /^https:\/\/(?:(?:vt|vm)\.tiktok\.com\/[A-Za-z0-9]+\/?(?:\?.*)?|www\.tiktok\.com\/t\/[A-Za-z0-9]+\/?(?:\?.*)?|www\.tiktok\.com\/@[\w.-]+\/video\/\d+(?:\?.*)?)$/,
};
