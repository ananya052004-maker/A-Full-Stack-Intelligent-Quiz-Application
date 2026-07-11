// A stable per-browser identity used across features so a person can
// vote / upvote once, and be recognised as the owner of things they created.
export function getVoterToken() {
  let t = localStorage.getItem('quorum_voter_token');
  if (!t) {
    t = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
    localStorage.setItem('quorum_voter_token', t);
  }
  return t;
}
