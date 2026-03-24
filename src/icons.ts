// Optimized, cropped SVGs of the Ringer logomark as data URIs.
// Light: black left link + teal right link (for light backgrounds)
// Dark: white left link + teal right link (for dark backgrounds)

const LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="280 250 230 115"><path d="M422.4,300.6c-4.6,4.6-12.2,4.6-16.8,0l-15.4-15.4c-3.7-3.7-8.8-5.8-14-5.8-5.3,0-10.3,2.1-14,5.8l-57.9,57.9c-4.6,4.6-12.2,4.6-16.8,0-4.6-4.6-4.6-12.2,0-16.8l57.9-57.9c8.2-8.2,19.3-12.8,30.8-12.8,11.6,0,22.7,4.6,30.8,12.8l15.4,15.4C427,288.4,427,296,422.4,300.6"/><path fill="#59C5C7" d="M369.6,311.4c4.6-4.6,12.2-4.6,16.8,0l15.4,15.4c3.7,3.7,8.8,5.8,14,5.8,5.3,0,10.3-2.1,14-5.8l57.9-57.9c4.6-4.6,12.2-4.6,16.8,0,4.6,4.6,4.6,12.2,0,16.8l-57.9,57.9c-8.2,8.2-19.3,12.8-30.8,12.8-11.6,0-22.7-4.6-30.8-12.8l-15.4-15.4C365,323.6,365,316,369.6,311.4"/></svg>`;

const DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="280 250 230 115"><path fill="#FFF" d="M422.4,300.6c-4.6,4.6-12.2,4.6-16.8,0l-15.4-15.4c-3.7-3.7-8.8-5.8-14-5.8-5.3,0-10.3,2.1-14,5.8l-57.9,57.9c-4.6,4.6-12.2,4.6-16.8,0-4.6-4.6-4.6-12.2,0-16.8l57.9-57.9c8.2-8.2,19.3-12.8,30.8-12.8,11.6,0,22.7,4.6,30.8,12.8l15.4,15.4C427,288.4,427,296,422.4,300.6"/><path fill="#59C5C7" d="M369.6,311.4c4.6-4.6,12.2-4.6,16.8,0l15.4,15.4c3.7,3.7,8.8,5.8,14,5.8,5.3,0,10.3-2.1,14-5.8l57.9-57.9c4.6-4.6,12.2-4.6,16.8,0,4.6,4.6,4.6,12.2,0,16.8l-57.9,57.9c-8.2,8.2-19.3,12.8-30.8,12.8-11.6,0-22.7-4.6-30.8-12.8l-15.4-15.4C365,323.6,365,316,369.6,311.4"/></svg>`;

function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// Export individual data URIs for use in client config files
export const ICON_LIGHT_DATA_URI = toDataUri(LIGHT_SVG);
export const ICON_DARK_DATA_URI = toDataUri(DARK_SVG);

export const ICONS = [
  {
    src: toDataUri(LIGHT_SVG),
    mimeType: "image/svg+xml",
    sizes: ["any"],
    theme: "light" as const,
  },
  {
    src: toDataUri(DARK_SVG),
    mimeType: "image/svg+xml",
    sizes: ["any"],
    theme: "dark" as const,
  },
];
