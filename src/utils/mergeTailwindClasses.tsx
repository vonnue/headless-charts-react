function mergeTailwindClasses(...classStrings: (string | undefined | null)[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classHash: any = {};
  classStrings
    .filter((classNameString) => classNameString && classNameString.length > 0)
    .map((str) => {
      str &&
        str.split(/\s+/g).map((token: string) => {
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
