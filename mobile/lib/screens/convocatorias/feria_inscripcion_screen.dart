import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/convocatoria_model.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';

class _IntegranteFeriaForm {
  final correo = TextEditingController();
  final registro = TextEditingController();
  final nombre = TextEditingController();
  final carrera = TextEditingController();
  final celular = TextEditingController();
  final semestre = TextEditingController(text: '0');
  final ferias = TextEditingController(text: '0');
  String estadoBusqueda = '';
  bool crearCuenta = false;

  void dispose() {
    for (final c in [correo, registro, nombre, carrera, celular, semestre, ferias]) {
      c.dispose();
    }
  }

  Map<String, dynamic> toJson() => {
    'correo': correo.text.trim().toLowerCase(),
    'registro': registro.text.trim(),
    'nombre': nombre.text.trim(),
    'carrera': carrera.text.trim(),
    'celular': celular.text.trim(),
    'semestre': int.tryParse(semestre.text.trim()) ?? 0,
    'ferias': int.tryParse(ferias.text.trim()) ?? 0,
    'crearCuenta': crearCuenta,
  };
}

class FeriaInscripcionScreen extends StatefulWidget {
  final ConvocatoriaModel convocatoria;
  const FeriaInscripcionScreen({super.key, required this.convocatoria});

  @override
  State<FeriaInscripcionScreen> createState() => _FeriaInscripcionScreenState();
}

class _FeriaInscripcionScreenState extends State<FeriaInscripcionScreen> {
  bool get _esFeria => widget.convocatoria.tipo == 'FERIA';
  final _formKey = GlobalKey<FormState>();
  final _tema = TextEditingController();
  final _area = TextEditingController();
  final _categoria = TextEditingController();
  final _materia = TextEditingController();
  final _sigla = TextEditingController();
  final _grupoMateria = TextEditingController();
  final _docente = TextEditingController();
  final List<_IntegranteFeriaForm> _integrantes = [];
  int _paso = 1;
  bool _enviando = false;
  String _correoJefe = '';

  int get _maximo {
    if (widget.convocatoria.maxIntegrantesFeria != null) return widget.convocatoria.maxIntegrantesFeria!;
    final numeros = RegExp(r'\d+').allMatches(widget.convocatoria.tamanoEquipo ?? '').toList();
    return numeros.isEmpty ? 5 : int.tryParse(numeros.last.group(0)!) ?? 5;
  }

  int get _minimo {
    final rango = RegExp(r'^\s*(\d+)\s+a\s+\d+', caseSensitive: false)
        .firstMatch(widget.convocatoria.tamanoEquipo ?? '');
    return rango == null ? 2 : (int.tryParse(rango.group(1)!) ?? 2).clamp(2, _maximo);
  }

  @override
  void initState() {
    super.initState();
    final jefe = _IntegranteFeriaForm();
    jefe.estadoBusqueda = 'existe';
    _integrantes.add(jefe);
    _cargarJefe();
  }

  Future<void> _cargarJefe() async {
    final user = await StorageService.getUser();
    if (!mounted || user == null) return;
    setState(() {
      _correoJefe = user.email.toLowerCase();
      _integrantes.first.correo.text = _correoJefe;
      _integrantes.first.nombre.text = user.nombreCompleto;
      _integrantes.first.registro.text = user.registroUniversitario ?? '';
      _integrantes.first.celular.text = user.celular ?? '';
    });
  }

  @override
  void dispose() {
    for (final c in [_tema, _area, _categoria, _materia, _sigla, _grupoMateria, _docente]) {
      c.dispose();
    }
    for (final i in _integrantes) { i.dispose(); }
    super.dispose();
  }

  void _mensaje(String mensaje) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  Future<void> _buscar(_IntegranteFeriaForm integrante) async {
    final correo = integrante.correo.text.trim().toLowerCase();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(correo)) {
      _mensaje('Ingresa un correo válido.'); return;
    }
    setState(() => integrante.estadoBusqueda = 'buscando');
    final resultado = await ApiService.buscarIntegranteFeria(widget.convocatoria.id, correo);
    if (!mounted) return;
    if (resultado == null) {
      setState(() => integrante.estadoBusqueda = '');
      _mensaje('No se pudo buscar el correo. Inténtalo de nuevo.');
      return;
    }
    setState(() {
      integrante.estadoBusqueda = resultado['existe'] == true ? 'existe' : 'nuevo';
      integrante.crearCuenta = false;
      if (resultado['existe'] == true) {
        integrante.nombre.text = (resultado['nombre'] ?? '').toString();
        integrante.registro.text = (resultado['registro'] ?? '').toString();
        integrante.celular.text = (resultado['celular'] ?? '').toString();
      }
    });
  }

  Future<void> _enviar() async {
    if (!_formKey.currentState!.validate()) return;
    if (_integrantes.length < _minimo || _integrantes.length > _maximo) {
      _mensaje('Se requieren entre $_minimo y $_maximo integrantes.'); return;
    }
    if (_integrantes.any((i) => i.estadoBusqueda != 'existe' && i.estadoBusqueda != 'crear')) {
      _mensaje('Busca el correo de cada integrante y confirma las cuentas nuevas.'); return;
    }
    final correos = _integrantes.map((i) => i.correo.text.trim().toLowerCase()).toList();
    final registros = _integrantes.map((i) => i.registro.text.trim()).where((r) => r.isNotEmpty).toList();
    if (!correos.contains(_correoJefe) || correos.toSet().length != correos.length ||
        registros.toSet().length != registros.length) {
      _mensaje('El jefe debe figurar en el equipo y no puede haber correos o registros repetidos.'); return;
    }
    setState(() => _enviando = true);
    final resultado = await ApiService.inscribirFeria(widget.convocatoria.id, {
      'tema': _tema.text.trim(), 'area': _area.text.trim(),
      'categoria': _categoria.text.trim(), 'materia': _materia.text.trim(),
      'sigla': _sigla.text.trim(), 'grupoMateria': _grupoMateria.text.trim(),
      'docente': _docente.text.trim(),
      'integrantes': _integrantes.map((i) => i.toJson()).toList(),
    });
    if (!mounted) return;
    setState(() => _enviando = false);
    if (resultado['success'] == true) {
      Navigator.pop(context, true);
    } else {
      _mensaje((resultado['error'] ?? 'No se pudo enviar la postulación.').toString());
    }
  }

  Widget _campo(String etiqueta, TextEditingController control, {bool opcional = false, bool numero = false, bool soloLectura = false}) {
    return TextFormField(
      controller: control,
      readOnly: soloLectura,
      keyboardType: numero ? TextInputType.number : TextInputType.text,
      inputFormatters: numero ? [FilteringTextInputFormatter.digitsOnly] : null,
      decoration: InputDecoration(labelText: etiqueta),
      validator: (valor) => !opcional && (valor == null || valor.trim().isEmpty) ? 'Campo obligatorio' : null,
    );
  }

  Widget _tarjetaIntegrante(_IntegranteFeriaForm integrante, int indice) {
    final habilitado = integrante.estadoBusqueda == 'existe' || integrante.estadoBusqueda == 'crear';
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text('Integrante ${indice + 1}${integrante.correo.text.trim().toLowerCase() == _correoJefe ? ' · Jefe' : ''}', style: const TextStyle(fontWeight: FontWeight.bold))),
            if (_integrantes.length > 1) IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => setState(() { _integrantes.removeAt(indice).dispose(); })),
          ]),
          TextFormField(
            controller: integrante.correo,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Correo electrónico *'),
            onChanged: (_) => setState(() { integrante.estadoBusqueda = ''; integrante.crearCuenta = false; }),
            validator: (v) => v == null || !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim()) ? 'Correo inválido' : null,
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: integrante.estadoBusqueda == 'buscando' ? null : () => _buscar(integrante), icon: const Icon(Icons.search), label: const Text('Buscar correo')),
          if (integrante.estadoBusqueda == 'nuevo') ...[
            const Text('Este correo no tiene cuenta en la plataforma.'),
            TextButton(onPressed: () => setState(() { integrante.estadoBusqueda = 'crear'; integrante.crearCuenta = true; }), child: const Text('Crear cuenta temporal')),
          ],
          if (integrante.estadoBusqueda == 'existe') const Text('Cuenta encontrada: se usará su nombre registrado.'),
          if (integrante.estadoBusqueda == 'crear') const Text('Se creará la cuenta temporal al enviar.'),
          if (habilitado) ...[
            _campo('Nombre completo', integrante.nombre, soloLectura: integrante.estadoBusqueda == 'existe'),
            _campo('Registro universitario (opcional)', integrante.registro, opcional: true),
            if (_esFeria) _campo('Carrera', integrante.carrera),
            _campo('Celular', integrante.celular),
            if (_esFeria) _campo('Semestre', integrante.semestre, numero: true),
            if (_esFeria) _campo('Ferias anteriores', integrante.ferias, numero: true),
          ],
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inscripción grupal')),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Text(widget.convocatoria.titulo, style: Theme.of(context).textTheme.titleLarge),
          Text('Entre $_minimo y $_maximo integrantes por equipo'),
          const SizedBox(height: 16),
          if (_paso == 1) ...[
            const Text('1. Datos del proyecto', style: TextStyle(fontWeight: FontWeight.bold)),
            _campo(_esFeria ? 'Tema' : 'Nombre del proyecto o equipo', _tema),
            if (_esFeria) ...[_campo('Área', _area), _campo('Categoría', _categoria),
              _campo('Materia', _materia), _campo('Sigla', _sigla),
              _campo('Grupo de la materia', _grupoMateria), _campo('Docente', _docente)],
            const SizedBox(height: 16),
            ElevatedButton(onPressed: () { if (_formKey.currentState!.validate()) setState(() => _paso = 2); }, child: const Text('Continuar con integrantes')),
          ] else ...[
            const Text('2. Integrantes del equipo', style: TextStyle(fontWeight: FontWeight.bold)),
            const Text('Busca primero el correo. Si no existe, confirma la creación de la cuenta. Contraseña inicial: primera letra del nombre, punto y registro; sin registro, seis ceros.'),
            const SizedBox(height: 12),
            for (int i = 0; i < _integrantes.length; i++) _tarjetaIntegrante(_integrantes[i], i),
            OutlinedButton.icon(
              onPressed: _integrantes.length >= _maximo ? null : () => setState(() => _integrantes.add(_IntegranteFeriaForm())),
              icon: const Icon(Icons.person_add_alt_1), label: Text('Agregar integrante (${_integrantes.length}/$_maximo)'),
            ),
            const SizedBox(height: 12),
            Row(children: [
              TextButton(onPressed: () => setState(() => _paso = 1), child: const Text('Volver al proyecto')),
              const Spacer(),
              ElevatedButton(onPressed: _enviando ? null : _enviar, child: Text(_enviando ? 'Enviando...' : 'Enviar postulación')),
            ]),
          ],
        ]),
      ),
    );
  }
}
