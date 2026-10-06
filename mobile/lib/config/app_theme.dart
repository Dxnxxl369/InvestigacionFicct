import 'package:flutter/material.dart';

class AppTheme {
  // Paleta de Colores Oficial FICCT (#0B2545 & #4CA64B)
  static const Color ink = Color(0xFF0B2545);
  static const Color inkSoft = Color(0xFF334A66);
  static const Color inkFaint = Color(0xFF6B829E);

  static const Color paper = Color(0xFFF8FAFC);
  static const Color paperRaised = Color(0xFFFFFFFF);
  static const Color paperSunken = Color(0xFFF0F4F8);

  static const Color line = Color(0xFFCBD8E6);
  static const Color lineSoft = Color(0xFFE2EAF2);

  static const Color accent = Color(0xFF4CA64B);
  static const Color accentDark = Color(0xFF3F8B3E);
  static const Color accentSoft = Color(0xFFEBF6EB);

  static const Color seal = Color(0xFF0B2545);
  static const Color sealSoft = Color(0xFFF0F4F8);

  static const Color danger = Color(0xFFDC2626);
  static const Color dangerSoft = Color(0xFFFEF2F2);

  static const Color gold = Color(0xFFD97706);
  static const Color goldSoft = Color(0xFFFEF3C7);
  static const Color primary = Color(0xFF0B2545);

  // Modo Oscuro Oficial FICCT
  static const Color darkInk = Color(0xFFFFFFFF);
  static const Color darkInkSoft = Color(0xFFCBD8E6);
  static const Color darkPaper = Color(0xFF060D17);
  static const Color darkPaperRaised = Color(0xFF0D1C33);
  static const Color darkPaperSunken = Color(0xFF091526);
  static const Color darkLine = Color(0xFF1E3A5F);
  static const Color darkAccent = Color(0xFF4CA64B);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: paper,
    primaryColor: accent,
    colorScheme: const ColorScheme.light(
      primary: accent,
      secondary: seal,
      surface: paperRaised,
      error: danger,
      onPrimary: Colors.white,
      onSurface: ink,
    ),
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: paper,
      elevation: 0,
      centerTitle: true,
      scrolledUnderElevation: 0,
      iconTheme: IconThemeData(color: ink),
      titleTextStyle: TextStyle(
        color: ink,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    ),
    cardTheme: CardThemeData(
      color: paperRaised,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: line, width: 1),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: accent,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: paperSunken,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: accent, width: 2),
      ),
      labelStyle: const TextStyle(color: inkSoft, fontSize: 13),
      hintStyle: const TextStyle(color: inkFaint, fontSize: 13),
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: darkPaper,
    primaryColor: darkAccent,
    colorScheme: const ColorScheme.dark(
      primary: darkAccent,
      secondary: seal,
      surface: darkPaperRaised,
      error: danger,
      onPrimary: Colors.white,
      onSurface: darkInk,
    ),
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: darkPaper,
      elevation: 0,
      centerTitle: true,
      scrolledUnderElevation: 0,
      iconTheme: IconThemeData(color: darkInk),
      titleTextStyle: TextStyle(
        color: darkInk,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    ),
    cardTheme: CardThemeData(
      color: darkPaperRaised,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: darkLine, width: 1),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: darkAccent,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: darkPaperSunken,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: darkLine),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: darkLine),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: darkAccent, width: 2),
      ),
      labelStyle: const TextStyle(color: darkInkSoft, fontSize: 13),
      hintStyle: const TextStyle(color: inkFaint, fontSize: 13),
    ),
  );
}
