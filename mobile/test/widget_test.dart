import 'package:flutter_test/flutter_test.dart';

import 'package:adwa_museum/main.dart';

void main() {
  testWidgets('Welcome screen smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MuseumGuideApp());

    expect(find.textContaining('Scan to begin'), findsOneWidget);
    expect(find.text('Begin Tour'), findsOneWidget);
  });
}
