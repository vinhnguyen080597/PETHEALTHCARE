export type BreedersDirectoryHeadingKeys = {
  titleKey: "breeders.title";
  subtitleKey: "breeders.subtitle";
};

/** Directory list uses the page title + verified-directory subtitle, not "Breeder storefronts". */
export function breedersDirectoryHeading(): BreedersDirectoryHeadingKeys {
  return {
    titleKey: "breeders.title",
    subtitleKey: "breeders.subtitle",
  };
}
