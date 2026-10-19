import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../../config/app_theme.dart';
import '../../../services/api_service.dart';
import '../../../services/storage_service.dart';

class VisorDocumentoScreen extends StatefulWidget {
  final String titulo;
  final String? url;
  final Uint8List? localBytes;

  const VisorDocumentoScreen({
    super.key,
    required this.titulo,
    this.url,
    this.localBytes,
  });

  /// Abre el visor en una nueva ruta de Navigator
  static Future<void> abrir(
    BuildContext context, {
    required String titulo,
    String? url,
    Uint8List? localBytes,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => VisorDocumentoScreen(
          titulo: titulo,
          url: url,
          localBytes: localBytes,
        ),
      ),
    );
  }

  @override
  State<VisorDocumentoScreen> createState() => _VisorDocumentoScreenState();
}

class _VisorDocumentoScreenState extends State<VisorDocumentoScreen> {
  static const Color _brandBlue = Color(0xFF38BDF8);

  bool _isLoading = true;
  String? _errorMessage;
  String? _localFilePath;
  int _totalPages = 0;
  int _currentPage = 0;
  PDFViewController? _pdfController;

  bool get _isPdf => widget.titulo.toLowerCase().endsWith('.pdf') || (widget.url?.toLowerCase().contains('.pdf') ?? false);
  bool get _isImage {
    final lower = widget.titulo.toLowerCase();
    return lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif');
  }

  @override
  void initState() {
    super.initState();
    _prepararArchivo();
  }

  Future<void> _prepararArchivo() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final tempDir = await getTemporaryDirectory();
      final cleanName = widget.titulo.replaceAll(RegExp(r'[^\w\.\-]'), '_');
      final file = File('${tempDir.path}/$cleanName');

      if (widget.localBytes != null) {
        await file.writeAsBytes(widget.localBytes!);
        if (mounted) {
          setState(() {
            _localFilePath = file.path;
            _isLoading = false;
          });
        }
        return;
      }

      if (widget.url != null && widget.url!.isNotEmpty) {
        final resolvedUrl = ApiService.resolveFileUrl(widget.url!);
        if (resolvedUrl == null) {
          throw Exception('URL de archivo inválida o no disponible');
        }

        final token = await StorageService.getToken();
        final headers = <String, String>{};
        if (token != null && token.isNotEmpty) {
          headers['Authorization'] = 'Bearer $token';
        }

        final res = await http.get(Uri.parse(resolvedUrl), headers: headers);
        if (res.statusCode == 200) {
          await file.writeAsBytes(res.bodyBytes);
          if (mounted) {
            setState(() {
              _localFilePath = file.path;
              _isLoading = false;
            });
          }
          return;
        } else {
          throw Exception('Error del servidor: HTTP ${res.statusCode}');
        }
      }

      throw Exception('No se proporcionó archivo ni URL para visualizar.');
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _compartirArchivo() async {
    if (_localFilePath == null) return;
    try {
      // ignore: deprecated_member_use
      await Share.shareXFiles(
        [XFile(_localFilePath!)],
        text: 'Documento: ${widget.titulo}',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('Error al compartir archivo: $e'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E293B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.titulo,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (_isPdf && _totalPages > 0)
              Text(
                'Página ${_currentPage + 1} de $_totalPages',
                style: const TextStyle(fontSize: 11, color: _brandBlue),
              ),
          ],
        ),
        actions: [
          if (_isPdf && _totalPages > 1) ...[
            IconButton(
              icon: const Icon(Icons.chevron_left_rounded),
              tooltip: 'Página anterior',
              onPressed: _currentPage > 0
                  ? () => _pdfController?.setPage(_currentPage - 1)
                  : null,
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right_rounded),
              tooltip: 'Página siguiente',
              onPressed: _currentPage < _totalPages - 1
                  ? () => _pdfController?.setPage(_currentPage + 1)
                  : null,
            ),
          ],
          if (_localFilePath != null)
            IconButton(
              icon: const Icon(Icons.share_rounded),
              tooltip: 'Compartir o guardar archivo',
              onPressed: _compartirArchivo,
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Recargar',
            onPressed: _prepararArchivo,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: _brandBlue),
            const SizedBox(height: 16),
            Text(
              'Cargando ${widget.titulo}...',
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppTheme.danger, size: 48),
              const SizedBox(height: 12),
              const Text(
                'No se pudo abrir el archivo',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white60, fontSize: 12),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _brandBlue,
                  foregroundColor: Colors.black,
                ),
                onPressed: _prepararArchivo,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    if (_isPdf && _localFilePath != null) {
      return Stack(
        children: [
          PDFView(
            filePath: _localFilePath,
            enableSwipe: true,
            swipeHorizontal: false,
            autoSpacing: true,
            pageFling: true,
            pageSnap: true,
            fitPolicy: FitPolicy.BOTH,
            preventLinkNavigation: false,
            onRender: (pages) {
              if (mounted) {
                setState(() {
                  _totalPages = pages ?? 0;
                });
              }
            },
            onError: (error) {
              if (mounted) {
                setState(() {
                  _errorMessage = error.toString();
                });
              }
            },
            onPageError: (page, error) {
              debugPrint('[PDFView] Error en página $page: $error');
            },
            onViewCreated: (PDFViewController controller) {
              _pdfController = controller;
            },
            onPageChanged: (int? page, int? total) {
              if (mounted && page != null) {
                setState(() {
                  _currentPage = page;
                  if (total != null) _totalPages = total;
                });
              }
            },
          ),
          if (_totalPages > 1)
            Positioned(
              bottom: 20,
              right: 20,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white24),
                ),
                child: Text(
                  '${_currentPage + 1} / $_totalPages',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ),
        ],
      );
    }

    if (_isImage && _localFilePath != null) {
      return Center(
        child: InteractiveViewer(
          panEnabled: true,
          minScale: 0.5,
          maxScale: 4.0,
          child: Image.file(
            File(_localFilePath!),
            fit: BoxFit.contain,
          ),
        ),
      );
    }

    // Archivo no previsualizable directamente en pantalla (ej. DOCX, ZIP)
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Card(
          color: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Colors.white12),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.insert_drive_file_rounded, color: _brandBlue, size: 64),
                const SizedBox(height: 16),
                Text(
                  widget.titulo,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Este tipo de archivo se ha descargado en tu dispositivo.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white60, fontSize: 12),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _brandBlue,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _compartirArchivo,
                  icon: const Icon(Icons.open_in_new_rounded, size: 18),
                  label: const Text('Abrir o Compartir con otra App'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
