// Sinh cặp đấu round-robin (circle method) cho thể thức League. Pure function,
// không "use server" — import vào actions.ts. Input mảng participant, trả mảng
// cặp {round, home, away}. N chẵn -> N-1 lượt, mỗi lượt N/2 trận. N lẻ -> thêm bye
// (null) nhưng skip cặp có bye. Xen kẽ home/away theo lượt để fair.

export type ParticipantRef = {
  id: string;
  displayName: string;
  teamId: string | null;
};

export type RoundRobinPair = {
  // 1-indexed: vòng 1..N-1 (N chẵn) hoặc 1..N (N lẻ có bye).
  round: number;
  home: ParticipantRef;
  away: ParticipantRef;
};

export function generateRoundRobinPairs(
  participants: ParticipantRef[],
): RoundRobinPair[] {
  const arr: (ParticipantRef | null)[] = [...participants];
  if (arr.length % 2 !== 0) arr.push(null);

  const pairs: RoundRobinPair[] = [];
  const n = arr.length;
  // Circle method: cố định arr[0], xoay phần còn lại.
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home && away) {
        // Xen kẽ home/away theo lượt để fair (tránh 1 đội đá liên tục sân nhà).
        if (round % 2 === 1) {
          pairs.push({ round: round + 1, home: away, away: home });
        } else {
          pairs.push({ round: round + 1, home, away });
        }
      }
    }
    // Xoay: arr[1..n-1] -> [arr[n-1], arr[1], arr[2], ..., arr[n-2]].
    const last = arr[n - 1];
    arr.splice(1, 0, last as ParticipantRef);
    arr.splice(n, 1);
  }
  return pairs;
}
