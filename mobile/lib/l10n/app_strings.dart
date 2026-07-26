import 'package:flutter/material.dart';

/// Fast string-map localization for static UI chrome.
///
/// Backend room/item copy is never translated here.
class AppStrings {
  AppStrings._(this._code);

  factory AppStrings.of(BuildContext context) {
    final Locale locale = Localizations.localeOf(context);
    return AppStrings._(locale.languageCode);
  }

  factory AppStrings.fromLocale(Locale locale) =>
      AppStrings._(locale.languageCode);

  final String _code;

  String _s(String en, String am) => _code == 'am' ? am : en;

  String get appTitle => _s('Museum Guide', 'የሙዚየም መምሪያ');
  String get beginTour => _s('Begin Tour', 'ጉብኝት ጀምር');
  String get scanToBeginTitle =>
      _s('Scan to begin\nyour tour', 'ጉብኝትዎን ለመጀመር\nQR ይቃኙ');
  String get scanToBeginBody => _s(
        'Point your camera at a room QR code to open the exhibition.',
        'ኤግዚቢሽኑን ለመክፈት ካሜራዎን ወደ የክፍሉ QR ኮድ ያድርጉ።',
      );
  String get scan => _s('Scan', 'ቃኝ');
  String get scanHeaderHint =>
      _s('POINT YOUR CAMERA AT A ROOM QR', 'ካሜራዎን ወደ የክፍል QR ያድርጉ');
  String get scanningOpeningRoom => _s('Opening room…', 'ክፍል በመከፈት ላይ…');
  String get scanWaiting => _s(
        'No QR detected yet. Hold steady over a code.',
        'QR ገና አልታየም። በኮዱ ላይ ያቆዩ።',
      );
  String get cameraPermissionTitle =>
      _s('Camera permission needed', 'የካሜራ ፍቃድ ያስፈልጋል');
  String get cameraPermissionBody => _s(
        'Allow camera access so you can scan a room QR code and begin the tour.',
        'ጉብኝት ለመጀመር ክፍል QR ለመቃኘት የካሜራ ፍቃድ ይፍቀዱ።',
      );
  String get yourTour => _s('YOUR TOUR', 'የእርስዎ ጉብኝት');
  String get tourRooms => _s('Tour rooms', 'የጉብኝት ክፍሎች');
  String get tourRoomsHint => _s(
        'Rooms appear after you scan a QR. Continue via each room’s next link.',
        'QR ከቃኙ በኋላ ክፍሎች ይታያሉ። በእያንዳንዱ ክፍል ቀጣይ አገናኝ ይቀጥሉ።',
      );
  String get enterRoom => _s('Enter room', 'ክፍል ግባ');
  String get scanToStartTour =>
      _s('Scan a room QR to start your tour', 'ጉብኝት ለመጀመር የክፍል QR ይቃኙ');
  String get scanToStartTourBody => _s(
        'This app works for any museum. The QR you scan sets the tour — nothing is hardcoded to one exhibition.',
        'ይህ መተግበሪያ ለማንኛውም ሙዚየም ይሰራል። የቃኙት QR ጉብኝቱን ይወስናል።',
      );
  String get couldNotLoadTour =>
      _s('Could not load the tour', 'ጉብኝቱን መጫን አልተቻለም');
  String get pleaseTryAgain => _s('Please try again.', 'እባክዎ እንደገና ይሞክሩ።');
  String get retry => _s('Retry', 'እንደገና ሞክር');
  String get roomLabel => _s('ROOM', 'ክፍል');
  String get roomOf => _s('OF', 'ከ');
  String get inThisRoom => _s('In this room', 'በዚህ ክፍል');
  String get noItemsYet =>
      _s('No items are listed for this room yet.', 'ለዚህ ክፍል እስካሁን ዕቃዎች የሉም።');
  String get continueNextRoom =>
      _s('Continue to next room', 'ወደ ቀጣዩ ክፍል ቀጥል');
  String get loading => _s('Loading…', 'በመጫን ላይ…');
  String get journeyTrail => _s('JOURNEY TRAIL', 'የጉብኝት መንገድ');
  String get next => _s('Next', 'ቀጣይ');
  String get tourComplete => _s('Tour Complete', 'ጉብኝቱ ተጠናቋል');
  String get chatWithAiGuide =>
      _s('Chat with AI guide', 'ከ AI መምሪያ ጋር ተወያይ');
  String get chatWithAiGuideTooltip =>
      _s('Chat with the AI guide', 'ከ AI መምሪያ ጋር ይወያዩ');
  String get aiGuide => _s('AI GUIDE', 'AI መምሪያ');
  String get aiGuideProgress =>
      _s('AI GUIDE PROGRESS', 'የ AI መምሪያ እድገት');
  String get chapterPrefix => _s('Chapter', 'ምዕራፍ');
  String get aboutThisPiece => _s('ABOUT THIS PIECE', 'ስለዚህ ቁራጭ');
  String get listenToAnswer => _s('Listen to answer', 'መልሱን ያድምጡ');
  String get pauseAnswer => _s('Pause answer', 'መልሱን አቁም');
  String get audioCouldNotPlay =>
      _s('Audio could not be played.', 'ኦዲዮ ማጫወት አልተቻለም።');
  String get settings => _s('Settings', 'ቅንብሮች');
  String get language => _s('Language', 'ቋንቋ');
  String get languageHint => _s(
        'Changes buttons and labels. Room and item stories stay in the language the museum provides.',
        'አዝራሮችንና መለያዎችን ይቀይራል። የክፍልና ዕቃ ታሪኮች በሙዚየሙ ቋንቋ ይቀራሉ።',
      );
  String get english => _s('English', 'English');
  String get amharic => _s('Amharic', 'አማርኛ');
  String get entry => _s('ENTRY', 'መግቢያ');
  String get validateTicketTitle =>
      _s('Validate your ticket', 'ቲኬትዎን ያረጋግጡ');
  String get validateTicketBody => _s(
        'Enter the admission code for this museum once. You will not be asked again for 24 hours.',
        'የመግቢያ ኮድዎን አንድ ጊዜ ያስገቡ። ለ፳፬ ሰዓታት እንደገና አይጠየቁም።',
      );
  String get ticketCode => _s('TICKET CODE', 'የቲኬት ኮድ');
  String get validateTicket => _s('Validate ticket', 'ቲኬት አረጋግጥ');
  String get enterTicketCode =>
      _s('Enter the ticket code from your admission.', 'ከመግቢያዎ የቲኬት ኮድ ያስገቡ።');
  String get ticketInvalid => _s(
        'This ticket is not valid for this exhibition. Check the code and try again.',
        'ይህ ቲኬት ለዚህ ኤግዚቢሽን አይሰራም። ኮዱን ያረጋግጡና እንደገና ይሞክሩ።',
      );
  String get ticketValidateFailed => _s(
        'Could not validate your ticket. Try again.',
        'ቲኬት ማረጋገጥ አልተቻለም። እንደገና ይሞክሩ።',
      );
  String get items => _s('items', 'ዕቃዎች');
  String get item => _s('item', 'ዕቃ');
  String get askPlaceholder => _s('Ask the guide…', 'መምሪያውን ይጠይቁ…');
  String get send => _s('Send', 'ላክ');
  String get voiceInputTooltip =>
      _s('Speak your question', 'ጥያቄዎን በድምጽ ይናገሩ');
  String get listening => _s('Listening…', 'በማዳመጥ ላይ…');
  String get voiceUnavailable => _s(
        'Voice input is not available on this device.',
        'በዚህ መሣሪያ የድምጽ ግቤት አይገኝም።',
      );

  String roomNumber(int n) => '$roomLabel $n';

  String roomNumberOf(int n, int total) => '$roomLabel $n $roomOf $total';

  String chapter(int n, String title) => '$chapterPrefix $n: $title';

  String itemCount(int n) => '$n ${n == 1 ? item : items}';
}
