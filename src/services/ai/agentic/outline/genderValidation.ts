type Gender = "male" | "female";

const MALE_KEYWORDS = [
  "male",
  "男",
  "男人",
  "男性",
  "man",
  "boy",
  "he",
  "him",
  "先生",
  "公子",
  "少爷",
  "王子",
  "皇子",
  "lord",
  "prince",
  "master",
  "king",
  "emperor",
  "duke",
  "sir",
  "gentleman",
  "前夫",
  "丈夫",
  "老公",
  "夫君",
  "郎君",
  "husband",
  "ex-husband",
  "boyfriend",
  "ex-boyfriend",
  "fiancé",
  "groom",
  "mr",
];

const FEMALE_KEYWORDS = [
  "female",
  "女",
  "女人",
  "女性",
  "woman",
  "girl",
  "she",
  "her",
  "小姐",
  "夫人",
  "姑娘",
  "公主",
  "皇后",
  "lady",
  "princess",
  "queen",
  "empress",
  "duchess",
  "miss",
  "madam",
  "mistress",
  "前妻",
  "妻子",
  "老婆",
  "太太",
  "娘子",
  "wife",
  "ex-wife",
  "girlfriend",
  "ex-girlfriend",
  "fiancée",
  "bride",
  "mrs",
  "ms",
];

const RELATIONSHIP_IDENTITY_KEYWORDS = [
  "前妻",
  "前夫",
  "妻子",
  "丈夫",
  "老婆",
  "老公",
  "太太",
  "夫君",
  "娘子",
  "wife",
  "husband",
  "ex-wife",
  "ex-husband",
  "girlfriend",
  "boyfriend",
  "lover",
  "fiancé",
  "fiancée",
  "spouse",
];

const isRecordObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isEnglishKeyword = (keyword: string): boolean =>
  /^[a-z][a-z- ]*$/i.test(keyword);

const containsKeyword = (text: string, keyword: string): boolean => {
  if (!text || !keyword) return false;

  if (isEnglishKeyword(keyword)) {
    const pattern = new RegExp(
      `\\b${escapeRegex(keyword.toLowerCase())}\\b`,
      "i",
    );
    return pattern.test(text);
  }

  return text.includes(keyword.toLowerCase());
};

const detectGenderSignal = (
  text: string,
): { hasMale: boolean; hasFemale: boolean } => {
  const hasMale = MALE_KEYWORDS.some((keyword) =>
    containsKeyword(text, keyword),
  );
  const hasFemale = FEMALE_KEYWORDS.some((keyword) =>
    containsKeyword(text, keyword),
  );
  return { hasMale, hasFemale };
};

const expectedGenderLabel = (expectedGender: Gender): string =>
  expectedGender === "male" ? "male (男性)" : "female (女性)";

export const validateGenderPreferencePhase3 = (
  phase3Data: unknown,
  expectedGender: Gender,
): string | null => {
  const playerVisible = (() => {
    if (!isRecordObject(phase3Data)) return {};
    const player = phase3Data.player;
    if (!isRecordObject(player)) return {};
    const profile = player.profile;
    if (!isRecordObject(profile)) return {};
    const visible = profile.visible;
    return isRecordObject(visible) ? visible : {};
  })();

  const genderedFields: Array<{ path: string; value: unknown }> = [
    { path: "visible.race", value: playerVisible?.race },
    { path: "visible.title", value: playerVisible?.title },
    { path: "visible.profession", value: playerVisible?.profession },
    { path: "visible.roleTag", value: playerVisible?.roleTag },
    { path: "visible.description", value: playerVisible?.description },
    { path: "visible.background", value: playerVisible?.background },
    { path: "visible.status", value: playerVisible?.status },
  ];

  const race = normalizeText(playerVisible?.race);
  const raceSignal = detectGenderSignal(race);

  if (!raceSignal.hasMale && !raceSignal.hasFemale) {
    return (
      `Phase 3: visible.race must explicitly include protagonist gender (${expectedGenderLabel(expectedGender)}), ` +
      `but visible.race is "${String(playerVisible?.race ?? "")}".`
    );
  }

  const relationshipIdentityRestrictedFields: Array<{
    path: "visible.title" | "visible.profession" | "visible.roleTag";
    value: unknown;
  }> = [
    { path: "visible.title", value: playerVisible?.title },
    { path: "visible.profession", value: playerVisible?.profession },
    { path: "visible.roleTag", value: playerVisible?.roleTag },
  ];

  for (const field of relationshipIdentityRestrictedFields) {
    const fieldText = normalizeText(field.value);
    if (!fieldText) continue;
    const hasRelationshipIdentity = RELATIONSHIP_IDENTITY_KEYWORDS.some(
      (keyword) => containsKeyword(fieldText, keyword),
    );

    if (!hasRelationshipIdentity) continue;

    const guidance =
      field.path === "visible.profession"
        ? "Use a concrete occupation/class (e.g., artisan/guard/scholar), not spouse labels."
        : "Use a role/title descriptor, not spouse labels.";

    return (
      `Phase 3: ${field.path} should not use relationship identity terms (current: "${String(field.value ?? "")}"). ` +
      guidance
    );
  }

  for (const field of genderedFields) {
    const fieldText = normalizeText(field.value);
    if (!fieldText) continue;

    const signal = detectGenderSignal(fieldText);
    if (signal.hasMale && signal.hasFemale) {
      return (
        `Phase 3: Gender signal conflict in ${field.path} - value "${String(field.value)}" contains mixed male/female labels. ` +
        `Please resubmit with a single protagonist gender: ${expectedGenderLabel(expectedGender)}.`
      );
    }

    const detectedGender: Gender | null = signal.hasFemale
      ? "female"
      : signal.hasMale
        ? "male"
        : null;

    if (detectedGender !== null && detectedGender !== expectedGender) {
      return (
        `Phase 3: Gender mismatch in ${field.path} - value "${String(field.value)}" conflicts with required protagonist gender ` +
        `${expectedGenderLabel(expectedGender)}. Ensure all gendered self-labels remain consistent.`
      );
    }
  }

  return null;
};
