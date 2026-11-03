export type OpenMatch = {
  id: string;
  homeTeam: string;
  homeLogo?: string;
  awayTeam?: string;
  awayLogo?: string;
  matchType?:
    | "FIND_OPPONENT"
    | "NEED_PLAYERS"
    | "INTERNAL";
  neededPlayers?: number;
  kickoff: string;
  fieldType: string;
  district: string;
  skillLabel: string;
  phone: string;
  fbLink: string;
};

export type DayBlock = {
  key: string;
  date: string;
  matches: OpenMatch[];
};

export const MOCK_REPORTED_MATCH_IDS_KEY = "mockReportedMatchIds";

export const openMatchesByDate: DayBlock[] = [
  {
    key: "2026-11-07",
    date: "Thứ Bảy, 7/11",
    matches: [
      {
        id: "mock-open-1",
        homeTeam: "FC Sông Hàn",
        kickoff: "15:00",
        fieldType: "Sân 7",
        district: "Q. Hải Châu",
        skillLabel: "Trung bình",
        phone: "0905123456",
        fbLink: "https://facebook.com/fcsonghan",
      },
      {
        id: "mock-open-2",
        homeTeam: "Thép Xanh",
        kickoff: "19:30",
        fieldType: "Sân 7",
        district: "Q. Thanh Khê",
        skillLabel: "Khá",
        phone: "0905234567",
        fbLink: "https://facebook.com/thepxanhfc",
      },
      {
        id: "mock-open-2b",
        homeTeam: "Dragon City FC",
        matchType: "NEED_PLAYERS",
        neededPlayers: 2,
        kickoff: "19:30",
        fieldType: "Sân 5",
        district: "Q. Sơn Trà",
        skillLabel: "Trung bình",
        phone: "",
        fbLink: "https://facebook.com/dragoncityfc",
      },
      {
        id: "mock-open-2c",
        homeTeam: "Hòa Xuân Lions",
        kickoff: "19:30",
        fieldType: "Sân 7",
        district: "Q. Cẩm Lệ",
        skillLabel: "Trung Bình Yếu",
        phone: "",
        fbLink: "https://facebook.com/hoaxuanlions",
      },
      {
        id: "mock-open-3",
        homeTeam: "Bạch Đằng Club",
        kickoff: "22:00",
        fieldType: "Sân 11",
        district: "Q. Sơn Trà",
        skillLabel: "Khá",
        phone: "0905567890",
        fbLink: "https://facebook.com/bachdangclub",
      },
    ],
  },
  {
    key: "2026-11-08",
    date: "Chủ Nhật, 8/11",
    matches: [
      {
        id: "mock-open-4",
        homeTeam: "Rồng Vàng",
        kickoff: "18:00",
        fieldType: "Sân 7",
        district: "Q. Liên Chiểu",
        skillLabel: "Trung bình",
        phone: "0905678901",
        fbLink: "https://facebook.com/rongvangfc",
      },
      {
        id: "mock-open-5",
        homeTeam: "An Hải Legends",
        matchType: "NEED_PLAYERS",
        neededPlayers: 1,
        kickoff: "21:00",
        fieldType: "Sân 5",
        district: "Q. Ngũ Hành Sơn",
        skillLabel: "Khá",
        phone: "",
        fbLink: "https://facebook.com/anhailg",
      },
    ],
  },
];

export function findMockOpenMatch(id: string): OpenMatch | null {
  for (const block of openMatchesByDate) {
    const found = block.matches.find((match) => match.id === id);
    if (found) return found;
  }
  return null;
}
