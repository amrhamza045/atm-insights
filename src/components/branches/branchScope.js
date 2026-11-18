// The header picker's selection as branch ids (a whole company = all of its
// branches; empty = no branch filter). BranchProvider keeps it current so the
// analytics data layer can read it at fetch time, outside React.
let current = [];

export const setBranchScope = (ids) => {
  current = ids;
};

export const getBranchScope = () => current;