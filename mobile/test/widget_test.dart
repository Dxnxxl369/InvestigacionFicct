import 'package:flutter_test/flutter_test.dart';
import 'package:ficct_mobile/main.dart';

void main() {
  testWidgets('FICCT Mobile smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const FicctMobileApp());
    expect(find.byType(FicctMobileApp), findsOneWidget);
  });
}
