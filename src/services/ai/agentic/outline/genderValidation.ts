type Gender = "male" | "female";
type GenderPreference = Gender | "pan_gender";

const MALE_KEYWORDS = [
  // English
  "male",
  "man",
  "men",
  "boy",
  "he",
  "him",
  "his",
  "himself",
  "guy",
  "gentleman",
  "sir",
  "mr",
  "king",
  "prince",
  "lord",
  "duke",
  "emperor",
  "father",
  "son",
  "brother",
  "husband",
  "boyfriend",
  "fiance",
  "fiancé",
  "groom",
  // CJK
  "男",
  "男性",
  "男人",
  "男生",
  "男孩",
  "先生",
  "公子",
  "少爷",
  "王子",
  "皇子",
  "国王",
  "皇帝",
  "公爵",
  "老爷",
  "丈夫",
  "老公",
  "夫君",
  "郎君",
  "前夫",
  "父亲",
  "儿子",
  "兄弟",
  "彼",
];

const FEMALE_KEYWORDS = [
  // English
  "female",
  "woman",
  "women",
  "girl",
  "she",
  "her",
  "hers",
  "herself",
  "lady",
  "madam",
  "miss",
  "mrs",
  "ms",
  "queen",
  "princess",
  "empress",
  "duchess",
  "mother",
  "daughter",
  "sister",
  "wife",
  "girlfriend",
  "fiancee",
  "fiancée",
  "bride",
  // CJK
  "女",
  "女性",
  "女人",
  "女生",
  "女孩",
  "小姐",
  "夫人",
  "姑娘",
  "公主",
  "皇后",
  "女王",
  "太太",
  "妻子",
  "老婆",
  "娘子",
  "前妻",
  "母亲",
  "女儿",
  "姐妹",
  "彼女",
];

const NEUTRAL_ALLOWED_KEYWORDS = [
  // English
  "unspecified",
  "unknown",
  "neutral",
  "androgynous",
  "nonbinary",
  "non-binary",
  "agender",
  "genderfluid",
  "pangender",
  "person",
  "human",
  "humanoid",
  // Chinese
  "未指明",
  "未说明",
  "未知",
  "不详",
  "中性",
  "无性别",
  "泛性别",
  "人类",
  "类人",
  "高维投影体",
];

const RELATIONSHIP_IDENTITY_KEYWORDS = [
  "wife",
  "husband",
  "ex-wife",
  "ex-husband",
  "girlfriend",
  "boyfriend",
  "fiance",
  "fiancé",
  "fiancee",
  "fiancée",
  "spouse",
  "wife-to-be",
  "husband-to-be",
  "妻子",
  "丈夫",
  "前妻",
  "前夫",
  "老婆",
  "老公",
  "太太",
  "夫君",
  "娘子",
  "未婚妻",
  "未婚夫",
  "配偶",
];

type GenderSignal = {
  hasMale: boolean;
  hasFemale: boolean;
  hasNeutral: boolean;
  maleMatches: string[];
  femaleMatches: string[];
};

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

const detectGenderSignal = (text: string): GenderSignal => {
  const normalized = normalizeText(text);
  const maleMatches = MALE_KEYWORDS.filter((keyword) =>
    containsKeyword(normalized, keyword),
  );
  const femaleMatches = FEMALE_KEYWORDS.filter((keyword) =>
    containsKeyword(normalized, keyword),
  );
  const hasNeutral = NEUTRAL_ALLOWED_KEYWORDS.some((keyword) =>
    containsKeyword(normalized, keyword),
  );
  return {
    hasMale: maleMatches.length > 0,
    hasFemale: femaleMatches.length > 0,
    hasNeutral,
    maleMatches,
    femaleMatches,
  };
};

const expectedGenderLabel = (expectedGender: Gender): string =>
  expectedGender === "male" ? "male (男性)" : "female (女性)";

const expectedGenderExamples = (expectedGender: Gender): string =>
  expectedGender === "male"
    ? "男性/男人/male/man/王子/少爷"
    : "女性/女人/female/woman/公主/小姐";

const formatSignalSummary = (signal: GenderSignal): string => {
  const tokens: string[] = [];
  if (signal.maleMatches.length > 0) {
    tokens.push(`male: ${signal.maleMatches.slice(0, 4).join(", ")}`);
  }
  if (signal.femaleMatches.length > 0) {
    tokens.push(`female: ${signal.femaleMatches.slice(0, 4).join(", ")}`);
  }
  return tokens.join(" | ");
};

const readPlayerLayers = (
  phase3Data: unknown,
): { visible: JsonObject; hidden: JsonObject } => {
  if (!isRecordObject(phase3Data)) return { visible: {}, hidden: {} };
  const player = phase3Data.player;
  if (!isRecordObject(player)) return { visible: {}, hidden: {} };
  const profile = player.profile;
  if (!isRecordObject(profile)) return { visible: {}, hidden: {} };
  const visible = isRecordObject(profile.visible) ? profile.visible : {};
  const hidden = isRecordObject(profile.hidden) ? profile.hidden : {};
  return { visible, hidden };
};

const resolveDetectedGender = (signal: GenderSignal): Gender | null => {
  if (signal.hasMale && signal.hasFemale) return null;
  if (signal.hasMale) return "male";
  if (signal.hasFemale) return "female";
  return null;
};

const validateRelationshipIdentityFields = (
  visible: JsonObject,
): string | null => {
  const restrictedFields: Array<{
    path: "visible.title" | "visible.profession" | "visible.roleTag";
    value: unknown;
  }> = [
    { path: "visible.title", value: visible.title },
    { path: "visible.profession", value: visible.profession },
    { path: "visible.roleTag", value: visible.roleTag },
  ];

  for (const field of restrictedFields) {
    const text = normalizeText(field.value);
    if (!text) continue;

    const hasRelationshipIdentity = RELATIONSHIP_IDENTITY_KEYWORDS.some(
      (keyword) => containsKeyword(text, keyword),
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

  return null;
};

export const validateGenderPreferencePhase3 = (
  phase3Data: unknown,
  preference: GenderPreference,
): string | null => {
  const { visible, hidden } = readPlayerLayers(phase3Data);

  if (preference === "pan_gender") {
    const inspectedFields: Array<{ path: string; value: unknown }> = [
      { path: "visible.gender", value: visible.gender },
      { path: "hidden.gender", value: hidden.gender },
      { path: "visible.race", value: visible.race },
      { path: "hidden.race", value: hidden.race },
      { path: "visible.title", value: visible.title },
      { path: "visible.profession", value: visible.profession },
      { path: "visible.roleTag", value: visible.roleTag },
      { path: "visible.description", value: visible.description },
      { path: "visible.background", value: visible.background },
      { path: "visible.status", value: visible.status },
    ];

    for (const field of inspectedFields) {
      const text = normalizeText(field.value);
      if (!text) continue;
      const signal = detectGenderSignal(text);
      if (!signal.hasMale && !signal.hasFemale) continue;

      return (
        `Phase 3: pan_gender forbids explicit male/female signals, but ${field.path} contains "${String(field.value)}" ` +
        `(${formatSignalSummary(signal)}). Use neutral/unspecified wording only.`
      );
    }

    return null;
  }

  const relationshipIdentityError = validateRelationshipIdentityFields(visible);
  if (relationshipIdentityError) {
    return relationshipIdentityError;
  }

  const hiddenGenderText = normalizeText(hidden.gender);
  const visibleGenderText = normalizeText(visible.gender);
  const hiddenSignal = detectGenderSignal(hiddenGenderText);
  const visibleSignal = detectGenderSignal(visibleGenderText);

  if (hiddenSignal.hasMale && hiddenSignal.hasFemale) {
    return (
      `Phase 3: hidden.gender contains mixed male/female signals ("${String(hidden.gender ?? "")}"). ` +
      "Provide a single clear true gender."
    );
  }

  if (visibleSignal.hasMale && visibleSignal.hasFemale) {
    return (
      `Phase 3: visible.gender contains mixed male/female signals ("${String(visible.gender ?? "")}"). ` +
      "Provide a single clear visible gender presentation."
    );
  }

  const hiddenDetected = resolveDetectedGender(hiddenSignal);
  if (hiddenDetected !== null) {
    if (hiddenDetected !== preference) {
      return (
        `Phase 3: hidden.gender ("${String(hidden.gender ?? "")}") conflicts with required protagonist gender ` +
        `${expectedGenderLabel(preference)}. hidden.gender is treated as the true gender when provided.`
      );
    }
    return null;
  }

  const visibleDetected = resolveDetectedGender(visibleSignal);
  if (visibleDetected !== null) {
    if (visibleDetected !== preference) {
      return (
        `Phase 3: visible.gender ("${String(visible.gender ?? "")}") conflicts with required protagonist gender ` +
        `${expectedGenderLabel(preference)}.`
      );
    }
    return null;
  }

  const neutralHints: string[] = [];
  if (hiddenSignal.hasNeutral)
    neutralHints.push("hidden.gender appears neutral/unspecified");
  if (visibleSignal.hasNeutral)
    neutralHints.push("visible.gender appears neutral/unspecified");

  return (
    `Phase 3: cannot determine protagonist gender from hidden.gender/visible.gender. ` +
    `Required: ${expectedGenderLabel(preference)} (examples: ${expectedGenderExamples(preference)}). ` +
    `Current hidden.gender="${String(hidden.gender ?? "")}", visible.gender="${String(visible.gender ?? "")}".` +
    (neutralHints.length > 0 ? ` Notes: ${neutralHints.join("; ")}.` : "")
  );
};
