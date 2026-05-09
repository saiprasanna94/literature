const FRIENDLY: Record<string, string> = {
  // Engine
  NOT_YOUR_TURN: "It's not your turn.",
  GAME_NOT_IN_PROGRESS: "The game isn't in progress.",
  PENDING_TURN_SELECTION: 'Waiting for someone on the awarded team to take the turn.',
  TARGET_SAME_TEAM: 'You can only ask the opposing team.',
  TARGET_EMPTY_HAND: 'That player has no cards left.',
  ASKER_LACKS_SET_MEMBERSHIP:
    'You must hold at least one card from that set before asking for cards in it.',
  ASKER_HOLDS_REQUESTED_CARD: "You can't ask for a card you already hold.",
  TARGET_NOT_FOUND: 'Player not found.',
  ASKER_NOT_FOUND: 'Player not found.',
  CLAIMER_NOT_FOUND: 'Player not found.',
  SET_ALREADY_CLAIMED: 'That set has already been claimed.',
  CLAIM_ASSIGNMENTS_INVALID: 'A claim must cover all 6 cards exactly once with no extras.',
  CLAIM_ASSIGNEE_NOT_TEAMMATE: 'You can only assign cards to your own teammates.',
  NOT_ELIGIBLE_FOR_TURN: 'Only the awarded team can take the turn now.',
  NO_PENDING_TURN_SELECTION: "There's no turn to take right now.",
  PLAYER_HAS_NO_CARDS: "That player has no cards and can't take the turn.",

  // Rooms
  ROOM_NOT_FOUND: 'Room not found — check the code.',
  ROOM_FULL: 'That room is full.',
  ROOM_NOT_FULL: 'All seats must be filled before starting.',
  GAME_ALREADY_STARTED: 'The game has already started.',
  GAME_NOT_STARTED: "The game hasn't started yet.",
  NAME_TAKEN: 'That name is already taken in this room.',
  PLAYER_NOT_IN_ROOM: "You're not in that room.",
  NOT_HOST: 'Only the host can do that.',
  NOT_IN_ROOM: "You're not in a room.",
  INVALID_NAME: 'Enter a valid name (1–24 characters).',

  // Connectivity
  NO_SOCKET: 'Not connected to the server.',
};

/** Map a server error code to a human message. Falls back to the raw code. */
export function friendlyError(code: string | null | undefined): string {
  if (!code) return '';
  return FRIENDLY[code] ?? code;
}
