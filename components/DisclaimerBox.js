import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function DisclaimerBox() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => {
      setExpanded(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [expanded]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded((prev) => !prev)}
      style={[styles.box, expanded && styles.boxExpanded]}
    >
      <Text style={[styles.text, expanded && styles.textExpanded]}>
        ℹ️ Незалежний інформаційний проєкт (не є офіційним додатком групи ДТЕК).
        Дані формуються з відкритих джерел щодо графіків у мережах АТ «ДТЕК
        Одеські електромережі» та метеосервісу Open-Meteo. Додаток не збирає
        персональні дані користувачів.
      </Text>
      <Text style={styles.hint}>
        {expanded
          ? "🔍 Натисніть, щоб згорнути (автозгортання через 7 сек)"
          : "🔍 Натисніть, щоб збільшити текст"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  boxExpanded: {
    backgroundColor: "#0F172A",
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#FFD700",
  },
  text: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  textExpanded: {
    color: "#F8FAFC",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  },
  hint: {
    color: "#FFD700",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    opacity: 0.85,
  },
});
