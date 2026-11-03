function mergeTailwindClasses(...classStrings: (string | undefined | null)[]) {
  const classHash: Record<string, string> = {};
  classStrings
    .filter((classNameString) => classNameString && classNameString.length > 0)
    .forEach((str) => {
      if (!str) return;
      str.split(/\s+/g).forEach((token: string) => {
        const parts = token.split('-');
        const base = parts[0];

        if (base === 'stroke' || base === 'fill') {
          const secondPart = parts[1];

          if (secondPart && !isNaN(Number(secondPart))) {
            classHash[`${base}-width`] = token;
          } else {
            classHash[base] = token;
          }
        } else {
          classHash[base] = token;
        }
      });
    });
  return Object.values(classHash).sort().join(' ');
}

export default mergeTailwindClasses;
