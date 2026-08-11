import axios from "axios";
import FormData from "form-data";
import { LoginData } from "../data/login.data";

const USERS_BASE_URL = "https://api-dev1.squadi.com/users";
const LIVESCORES_BASE_URL = "https://api-dev1.squadi.com/livescores";

export class MatchApiHelper {
  static async getToken(username: string, password: string): Promise<string> {
    const encoded = Buffer.from(`${username}:${password}`).toString("base64");

    try {
      const response = await axios.get(`${USERS_BASE_URL}/users/loginWithTfa`, {
        headers: {
          Authorization: `BWSA ${encoded}`,
          SourceSystem: "WebAdmin",
          Accept: "application/json",
        },
      });

      const token = response.data?.authToken;

      if (!token) {
        throw new Error(
          `Auth token not found: ${JSON.stringify(response.data)}`,
        );
      }

      return token;
    } catch (err: any) {
      // TEMP DIAGNOSTICS: surface the real cause behind a 403 in CI.
      if (axios.isAxiosError(err)) {
        console.error("=== getToken request failed ===");
        console.error("URL:", `${USERS_BASE_URL}/users/loginWithTfa`);
        console.error(
          "Status:",
          err.response?.status,
          err.response?.statusText,
        );
        console.error(
          "Response headers:",
          JSON.stringify(err.response?.headers, null, 2),
        );
        console.error(
          "Response body:",
          typeof err.response?.data === "string"
            ? err.response?.data?.slice(0, 1000)
            : JSON.stringify(err.response?.data, null, 2),
        );
        console.error("================================");
      }
      throw err;
    }
  }

  static getPakistanFutureTimeUtc(minutesAhead: number = 3): string {
    const now = new Date();

    // Add minutes to current real time first
    now.setMinutes(now.getMinutes() + minutesAhead);

    // toISOString gives UTC automatically
    return now.toISOString();
  }

  static async createMatch(
    token: string,
    minutesAhead: number = 3,
  ): Promise<number> {
    const startTime = this.getPakistanFutureTimeUtc(minutesAhead);

    const payload = {
      id: 0,
      startTime,

      divisionId: 541,
      type: "TWO_HALVES",
      competitionId: 239,

      team1Id: 2269,
      team2Id: 2270,

      venueCourtId: 42,
      roundId: 13215,

      matchDuration: 4,
      mainBreakDuration: 2,
      breakDuration: 2,

      team1Score: 0,
      team2Score: 0,

      hasPenalty: false,

      team1PenaltyScore: null,
      team2PenaltyScore: null,

      resultStatus: null,
      team1ResultId: null,
      team2ResultId: null,

      matchStatus: "NOT_STARTED",
      matchSubstatusRefId: 1,

      endTime: null,

      rosters: [
        {
          roleId: 21,
          userId: 8364,
          teamId: null,
          sequence: 1,
        },
        {
          roleId: 4,
          userId: 160547,
          teamId: 2269,
          sequence: 1,
        },
      ],

      isFinals: false,
      isLocked: false,

      extraTimeType: null,
      extraTimeDuration: null,
      extraTimeMainBreak: null,
      extraTimeBreak: null,
      extraTimeWinByGoals: null,
      extraTimeFor: null,

      subCourt: "H",

      competitionOrganisationId: null,

      matchScoresData: [],
      matchTeamOfficials: [],
      officials: [],

      canRegenLadderPoints: false,
      isEndingMatch: false,
    };

    const response = await axios.post(
      `${LIVESCORES_BASE_URL}/matches`,
      payload,
      {
        headers: {
          Authorization: `${token}`,
          SourceSystem: "WebAdmin",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    const matchId = response.data?.id;

    if (!matchId) {
      throw new Error(`Match ID not found: ${JSON.stringify(response.data)}`);
    }

    return matchId;
  }

  static async getMatch(token: string, matchId: number): Promise<any> {
    const response = await axios.get(
      `${LIVESCORES_BASE_URL}/matches/id/${matchId}`,
      {
        headers: {
          Authorization: `${token}`,
          SourceSystem: "WebAdmin",
          Accept: "application/json",
        },
      },
    );
    return response.data;
  }

  static async updateMatchStartTime(
    token: string,
    matchId: number,
    minutesAhead: number = 3,
  ): Promise<void> {
    const startTime = this.getPakistanFutureTimeUtc(minutesAhead);
    const match = await this.getMatch(token, matchId);
    const payload = {
      id: match.id,
      startTime,

      divisionId: match.divisionId,
      type: match.type,
      competitionId: match.competitionId,

      team1Id: match.team1Id,
      team2Id: match.team2Id,

      venueCourtId: match.venueCourtId,
      roundId: match.roundId,

      matchDuration: match.matchDuration,
      mainBreakDuration: match.mainBreakDuration,
      breakDuration: match.breakDuration,

      team1Score: match.team1Score,
      team2Score: match.team2Score,

      hasPenalty: match.hasPenalty,
      team1PenaltyScore: match.team1PenaltyScore,
      team2PenaltyScore: match.team2PenaltyScore,

      resultStatus: match.resultStatus,
      team1ResultId: match.team1ResultId,
      team2ResultId: match.team2ResultId,

      matchStatus: match.matchStatus ?? "NOT_STARTED",
      matchSubstatusRefId: match.matchSubstatusRefId,

      endTime: match.endTime,

      // Preserve existing rosters, mapped to the shape the create/update endpoint expects.
      rosters: (match.rosters ?? []).map((r: any) => ({
        roleId: r.roleId,
        userId: r.userId,
        teamId: r.teamId,
        sequence: r.sequence,
      })),

      isFinals: match.isFinals,
      isLocked: match.isResultsLocked ?? false,

      extraTimeType: match.extraTimeType,
      extraTimeDuration: match.extraTimeDuration,
      extraTimeMainBreak: match.extraTimeMainBreak,
      extraTimeBreak: match.extraTimeBreak,
      extraTimeWinByGoals: match.extraTimeWinByGoals,
      extraTimeFor: match.extraTimeFor,

      subCourt: match.subCourt,

      competitionOrganisationId: match.competitionOrganisationId ?? null,

      matchScoresData: [],
      matchTeamOfficials: [],
      officials: [],

      canRegenLadderPoints: false,
      isEndingMatch: false,
    };

    await axios.post(`${LIVESCORES_BASE_URL}/matches`, payload, {
      headers: {
        Authorization: `${token}`,
        SourceSystem: "WebAdmin",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  static async deleteMatch(token: string, matchId: number): Promise<void> {
    await axios.delete(`${LIVESCORES_BASE_URL}/matches/id/${matchId}`, {
      headers: {
        Authorization: `${token}`,
        SourceSystem: "WebAdmin",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  static async assignReferee(
    token: string,
    matchId: number,
    umpireUserId = 161700,
  ): Promise<void> {
    const payload = {
      matchId,
      competitionId: 239,
      organisationId: 58,
      rosters: [
        {
          userId: umpireUserId,
          roleId: 15,
          sequence: 1,
          matchId,
          umpireName: "Syed Referee1 Only",
          competitionOrganisationId: 0, // replace with your value
          umpireType: "USERS",
          enableAffiliateAssignment: false,
        },
      ],
      officials: [],
    };

    await axios.post(`${LIVESCORES_BASE_URL}/matches/umpireRosters`, payload, {
      headers: {
        Authorization: `${token}`,
        SourceSystem: "WebAdmin",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  static async publishMatchOfficials(
    token: string,
    matchId: number,
  ): Promise<void> {
    console.log(`Publishing match officials for Match ID: ${matchId}`);
    const params = new URLSearchParams({
      timezone: "Asia/Karachi",
      yearRefId: "6",
      competitionId: "239",
      organisationId: "58",
      matchId: String(matchId),
      divisionIds: "[]",
      roundIds: "[]",
      venueIds: "[]",
      startDate: "null",
      endDate: "null",
      whenPublish: "2",
      publishedAt: "null",
    });

    await axios.post(
      `${LIVESCORES_BASE_URL}/matchUmpire/publishUmpire?${params.toString()}`,
      null,
      {
        headers: {
          Authorization: `${token}`,
          SourceSystem: "WebAdmin",
          Accept: "application/json",
          // "Content-Type": "application/json",
        },
      },
    );
  }

  static async updateCompetitionScoring(
    token: string,
    mode: "MANAGERS" | "COURT",
    courtScorerUserId?: number,
  ): Promise<any> {
    const form = new FormData();

    form.append("id", "239");
    form.append("name", "HR-ASN2-MD-Only");
    form.append("longName", "HR-ASN2-MD-Only");
    form.append("organisationId", "58");
    form.append("yearRefId", "6");

    form.append("scoringType", "SINGLE");
    form.append("whoScoring", mode);
    form.append("acceptScoring", "SCORER");

    form.append(
      "courtScorerUserId",
      mode === "COURT" ? String(courtScorerUserId) : "null",
    );

    form.append("timerType", "PER_MATCH_PER_PERIOD");
    form.append("attendanceRecordingType", "BOTH");
    form.append("attendanceRecordingPeriod", "MATCH");
    form.append("recordUmpireType", "USERS");

    form.append("timeoutDetails", "{}");
    form.append("officialOrganisationIds", "[]");
    form.append("linkedMembershipProductIds", "[]");
    form.append("linkedCompetitionIds", "[]");
    form.append("fieldClosureAdmins", "[]");

    form.append(
      "umpireSequenceSettings",
      JSON.stringify({
        CoachEnabled: true,
        ReserveEnabled: false,
        NumberOfUmpires: 3,
        officialSettings: {
          1: false,
          2: false,
          3: false,
          4: false,
          5: false,
          6: false,
          7: false,
          8: false,
          9: false,
          10: false,
        },
        AnyoneCanBeUmpire: false,
        NumberOfOfficials: 0,
        AllowHomeTeamManagerToVerifyOfficials: false,
      }),
    );

    form.append(
      "pointScheme",
      JSON.stringify([
        { id: 1, value: [1] },
        { id: 10, value: [1] },
        { id: 11, value: [1] },
      ]),
    );

    form.append(
      "borrowingPlayersRestrictionSetting",
      JSON.stringify({
        isUseAllDivisions: false,
        rules: [],
      }),
    );

    form.append(
      "finalsEligibilitySetting",
      JSON.stringify({
        enabled: false,
        isUseAllDivisions: false,
        rules: [],
      }),
    );

    form.append(
      "forfeitSettings",
      JSON.stringify({
        affiliateForfeits: {
          checked: false,
          threshold: true,
          thresholdFrom: 0,
          thresholdTo: 0,
        },
        refereeForfeits: {
          checked: false,
          threshold: true,
          thresholdFrom: 0,
          thresholdTo: 0,
        },
        refereeAbandon: {
          checked: false,
          threshold: true,
          thresholdFrom: 0,
          thresholdTo: 0,
        },
        managerForfeits: {
          checked: false,
          thresholdFrom: 0,
          thresholdTo: 0,
        },
      }),
    );

    form.append(
      "teamOfficialRoleList",
      JSON.stringify([
        {
          id: 435,
          competitionId: 239,
          roleId: 3,
          lookupRoleId: 3,
          sequence: 1,
        },
        {
          id: 436,
          competitionId: 239,
          roleId: 17,
          lookupRoleId: 17,
          sequence: 2,
        },
      ]),
    );

    form.append(
      "bestAndFairests",
      JSON.stringify([
        {
          id: 1728,
          enabled: false,
          preferenceSetByRefId: 1,
          awardWhichTeamRefId: 1,
          receivingBFPointsRefId: 2,
          bestAndFairestTypeRefId: 2,
        },
        {
          id: 1727,
          enabled: false,
          preferenceSetByRefId: 1,
          awardWhichTeamRefId: 1,
          receivingBFPointsRefId: 2,
          bestAndFairestTypeRefId: 1,
        },
      ]),
    );

    form.append(
      "foulsSettings",
      JSON.stringify({
        sendoffReport: [
          { type: "RC", value: "1" },
          { type: "R1", value: "1" },
          { type: "R2", value: "1" },
          { type: "R3", value: "1" },
          { type: "R4", value: "1" },
          { type: "R5", value: "1" },
          { type: "R6", value: "1" },
          { type: "R7", value: "1" },
          { type: "R8", value: "1" },
        ],
        recordOffenceCodes: true,
      }),
    );

    form.append("gameTimeTracking", "1");
    form.append("attendanceSelectionTime", "14400");
    form.append("attendanceSelectionTimeEnd", "0");
    form.append("allowAffiliatesEnterScore", "0");
    form.append("isInvitorsChanged", "false");

    const response = await axios.post(
      `${LIVESCORES_BASE_URL}/competitions?competitionId=239&venues=[12,112]`,
      form,
      {
        headers: {
          Authorization: token,
          SourceSystem: "WebAdmin",
          Accept: "application/json",
          ...form.getHeaders(),
        },
      },
    );

    return response.data;
  }

  static async createAndPublishMatch(
    minutesAhead: number = 3,
  ): Promise<number> {
    // Generate auth token
    const token = await MatchApiHelper.getToken(
      LoginData.email,
      LoginData.password,
    );

    // Create match
    const matchId = await this.createMatch(token, minutesAhead);
    await MatchApiHelper.assignReferee(token, matchId);

    await this.publishMatchOfficials(token, matchId);

    return matchId;
  }
}
