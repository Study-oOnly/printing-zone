// নাম মেলানোর জন্য: বড়-ছোট হাতের অক্ষর ও বাড়তি ফাঁকা জায়গা উপেক্ষা করে
export function normName(s) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function sameName(a, b) {
  return normName(a) === normName(b);
}