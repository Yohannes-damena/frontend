import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../screens/stitch_export/stitch_theme.dart';

/// Wikimedia requires an identifying User-Agent; Dart's default is often blocked.
const Map<String, String> kWikimediaHttpHeaders = <String, String>{
  'User-Agent': 'AdwaMuseum/1.0 (educational Flutter app; local development)',
  'Accept': 'image/*,*/*;q=0.8',
};

/// Image that fills its parent like [Image.network] + [BoxFit.cover].
///
/// Supports both remote URLs and bundled asset paths (`assets/...`).
class MuseumNetworkImage extends StatelessWidget {
  const MuseumNetworkImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.fallback,
  });

  final String url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget? fallback;

  bool get _isAsset => url.startsWith('assets/');

  @override
  Widget build(BuildContext context) {
    final Widget error = fallback ??
        ColoredBox(
          color: StitchTheme.panel,
          child: SizedBox(
            width: width,
            height: height,
            child: const Center(
              child: Icon(
                Icons.image_not_supported_outlined,
                color: StitchTheme.muted,
                size: 40,
              ),
            ),
          ),
        );

    if (url.trim().isEmpty) {
      return error;
    }

    if (_isAsset) {
      final Widget asset = Image.asset(
        url,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => error,
        frameBuilder: (
          BuildContext context,
          Widget child,
          int? frame,
          bool wasSynchronouslyLoaded,
        ) {
          if (wasSynchronouslyLoaded || frame != null) {
            return child;
          }
          return ColoredBox(
            color: StitchTheme.panel,
            child: SizedBox(
              width: width,
              height: height,
              child: const Center(
                child: SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: StitchTheme.muted,
                  ),
                ),
              ),
            ),
          );
        },
      );

      if (width == null && height == null) {
        return SizedBox.expand(
          child: DecoratedBox(
            decoration: BoxDecoration(
              image: DecorationImage(
                image: AssetImage(url),
                fit: fit,
              ),
            ),
          ),
        );
      }
      return asset;
    }

    final Widget image = CachedNetworkImage(
      imageUrl: url,
      width: width,
      height: height,
      fit: fit,
      httpHeaders: kWikimediaHttpHeaders,
      fadeInDuration: const Duration(milliseconds: 200),
      memCacheWidth: 1600,
      // DecorationImage fills parent constraints; CachedNetworkImage alone often
      // lays out at 0×0 inside Stack / FlexibleSpaceBar / Expanded.
      imageBuilder: (BuildContext context, ImageProvider imageProvider) {
        return DecoratedBox(
          decoration: BoxDecoration(
            image: DecorationImage(image: imageProvider, fit: fit),
          ),
          child: SizedBox(width: width, height: height),
        );
      },
      placeholder: (_, __) => ColoredBox(
        color: StitchTheme.panel,
        child: SizedBox(
          width: width,
          height: height,
          child: const Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: StitchTheme.muted,
              ),
            ),
          ),
        ),
      ),
      errorWidget: (_, __, ___) => error,
    );

    if (width == null && height == null) {
      return SizedBox.expand(child: image);
    }
    return image;
  }
}
