export const detectSuspiciousActivity = ({
  tabSwitchCount = 0,
  windowBlurCount = 0,
  faceMissingFrames = 0
}) => {
  const score = tabSwitchCount * 2 + windowBlurCount + faceMissingFrames * 0.5;
  const severity = score > 20 ? "high" : score > 10 ? "medium" : "low";
  return { score, severity };
};
