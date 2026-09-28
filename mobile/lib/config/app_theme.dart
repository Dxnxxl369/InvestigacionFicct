import 'package:flutter/material.dart';

class AppTheme {
  // Paleta de Colores Oficial FICCT
  static const Color ink = Color(0xFF16243D);
  static const Color inkSoft = Color(0xFF4B5566);
  static const Color inkFaint = Color(0xFF8890A0);

  static const Color paper = Color(0xFFF5F3ED);
  static const Color paperRaised = Color(0xFFFFFFFF);
  static const Color paperSunken = Color(0xFFFBFAF6);

  static const Color line = Color(0xFFDEDAD0);
  static const Color lineSoft = Color(0xFFE9E6DD);

  static const Color accent = Color(0xFF1F6F5C);
  static const Color accentDark = Color(0xFF154E41);
  static const Color accentSoft = Color(0xFFE4EFE9);

  static const Color seal = Color(0xFFA97C34);
  static const Color sealSoft = Color(0xFFF4E8D2);

  static const Color danger = Color(0xFFB23A34);
  static const Color dangerSoft = Color(0xFFF7E2DE);

  // Modo Oscuro
  static const Color darkInk = Color(0xFFEAEDF3);
  static const Color darkInkSoft = Color(0xFFA7B0C2);
  static const Color darkPaper = Color(0xFF0C1220);
  static const Color darkPaperRaised = Color(0xFF131B2E);
  static const Color darkPaperSunken = Color(0xFF101728);
  static const Color darkLine = Color(0xFF232F48);
  static const Color darkAccent = Color(0xFF49B394);

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
