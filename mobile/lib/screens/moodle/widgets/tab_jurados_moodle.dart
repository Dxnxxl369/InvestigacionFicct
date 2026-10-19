import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class TabJuradosMoodle extends StatefulWidget {
  final int convocatoriaId;
  final VoidCallback onChanged;

  const TabJuradosMoodle({super.key, required this.convocatoriaId, required this.onChanged});

  @override
  State<TabJuradosMoodle> createState() => _TabJuradosMoodleState();
}

class _TabJuradosMoodleState extends State<TabJuradosMoodle> {
  List<Map<String, dynamic>> jurados = [];
  List<Map<String, dynamic>> proyectos = [];
  List<Map<String, dynamic>> disponibles = [];
  final Map<int, String> alcances = {};
  final Map<int, Set<int>> seleccionados = {};
  int? usuarioId;
  bool cargando = true;
  bool guardando = false;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _mensaje(String texto) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(texto)));
  }

  Future<void> _cargar() async {
    try {
      final resultados = await Future.wait([
        ApiService.getJuradosConvocatoria(widget.convocatoriaId),
        ApiService.getEncargadosDisponibles(),
      ]);
      if (!mounted) return;
      final datos = resultados[0];
      final catalogo = resultados[1] as Map<String, List<Map<String, dynamic>>>;
      setState(() {
        jurados = (datos['jurados'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
        proyectos = (datos['proyectos'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
        disponibles = catalogo['jurados'] ?? [];
        alcances.clear();
        seleccionados.clear();
        for (final jurado in jurados) {
          final id = jurado['participanteId'] as int;
          final ids = (jurado['proyectoIds'] as List<dynamic>? ?? []).cast<int>().toSet();
          seleccionados[id] = ids;
          alcances[id] = jurado['todos'] == true ? 'TODOS' : ids.isEmpty ? 'NINGUNO' : 'SELECCION';
        }
        cargando = false;
      });
    } catch (_) {
      if (mounted) setState(() => cargando = false);
      _mensaje('No se pudieron cargar los jurados');
    }
  }

  Future<void> _agregar() async {
    if (usuarioId == null) return;
    setState(() => guardando = true);
    final ok = await ApiService.designarParticipante(widget.convocatoriaId,
        usuarioId: usuarioId!, rol: 'JURADO');
    if (ok) {
      usuarioId = null;
      await _cargar();
      widget.onChanged();
      _mensaje('Jurado designado sin proyectos asignados');
    } else {
      _mensaje('No se pudo designar al jurado');
    }
    if (mounted) setState(() => guardando = false);
  }

  Future<void> _crearYAnadir() async {
    final nombre = TextEditingController();
    final apellido = TextEditingController();
    final correo = TextEditingController();
    final contrasena = TextEditingController();
    final formulario = GlobalKey<FormState>();
    bool enviando = false;
    try {
      final creado = await showDialog<bool>(context: context, builder: (dialogContext) =>
        StatefulBuilder(builder: (dialogContext, actualizar) => AlertDialog(
          title: const Text('Crear y añadir jurado'),
          content: Form(key: formulario, child: SingleChildScrollView(child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(controller: nombre, decoration: const InputDecoration(labelText: 'Nombre'),
                validator: (valor) => (valor?.trim().length ?? 0) < 2 ? 'Ingresa el nombre' : null),
              TextFormField(controller: apellido, decoration: const InputDecoration(labelText: 'Apellido'),
                validator: (valor) => (valor?.trim().length ?? 0) < 2 ? 'Ingresa el apellido' : null),
              TextFormField(controller: correo, keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Correo'),
                validator: (valor) => (valor?.trim().contains('@') ?? false) ? null : 'Ingresa un correo válido'),
              TextFormField(controller: contrasena, obscureText: true,
                decoration: const InputDecoration(labelText: 'Contraseña'),
                validator: (valor) => (valor?.length ?? 0) < 8 ? 'Mínimo 8 caracteres' : null),
            ],
          ))),
          actions: [
            TextButton(onPressed: enviando ? null : () => Navigator.pop(dialogContext, false),
              child: const Text('Cancelar')),
            FilledButton(onPressed: enviando ? null : () async {
              if (!formulario.currentState!.validate()) return;
              actualizar(() => enviando = true);
              try {
                await ApiService.crearYAnadirJurado(widget.convocatoriaId,
                  nombre: nombre.text, apellido: apellido.text,
                  correo: correo.text, contrasena: contrasena.text);
                if (dialogContext.mounted) Navigator.pop(dialogContext, true);
              } catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))));
                  actualizar(() => enviando = false);
                }
              }
            }, child: const Text('Crear y añadir')),
          ],
        )),
      );
      if (creado == true && mounted) {
        await _cargar();
        widget.onChanged();
        _mensaje('Jurado creado y añadido sin proyectos asignados');
      }
    } finally {
      nombre.dispose();
      apellido.dispose();
      correo.dispose();
      contrasena.dispose();
    }
  }

  Future<void> _guardar(int id) async {
    setState(() => guardando = true);
    try {
      await ApiService.guardarAsignacionJurado(widget.convocatoriaId, id,
          todos: alcances[id] == 'TODOS',
          proyectoIds: alcances[id] == 'SELECCION' ? (seleccionados[id] ?? <int>{}).toList() : []);
      await _cargar();
      _mensaje('Asignación guardada');
    } catch (_) {
      _mensaje('No se pudo guardar la asignación');
    }
    if (mounted) setState(() => guardando = false);
  }

  Future<void> _quitar(int id) async {
    final confirmar = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Quitar jurado'),
      content: const Text('¿Quitar a este jurado de la convocatoria?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
        TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Quitar')),
      ],
    ));
    if (confirmar != true) return;
    setState(() => guardando = true);
    final ok = await ApiService.removerParticipante(widget.convocatoriaId, id);
    if (ok) {
      await _cargar();
      widget.onChanged();
      _mensaje('Jurado retirado');
    } else {
      _mensaje('No se pudo retirar al jurado');
    }
    if (mounted) setState(() => guardando = false);
  }

  @override
  Widget build(BuildContext context) {
    if (cargando) return const Center(child: CircularProgressIndicator());
    final candidatos = disponibles.where((u) => !jurados.any((j) => j['usuarioId'] == u['id'])).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Jurados de la convocatoria', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          const SizedBox(height: 6),
          const Text('Cada jurado comienza sin proyectos. «Todos» incluye los proyectos que se admitan después.'),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            initialValue: usuarioId,
            decoration: const InputDecoration(labelText: 'Seleccionar jurado'),
            items: candidatos.map((u) => DropdownMenuItem<int>(value: u['id'] as int,
              child: Text('${u['nombre']} ${u['apellidos'] ?? ''} (${u['email']})', overflow: TextOverflow.ellipsis))).toList(),
            onChanged: guardando ? null : (id) => setState(() => usuarioId = id),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(onPressed: usuarioId == null || guardando ? null : _agregar,
              icon: const Icon(Icons.person_add), label: const Text('Añadir jurado')),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: guardando ? null : _crearYAnadir,
              icon: const Icon(Icons.person_add_alt_1), label: const Text('Crear y añadir jurado')),
        ],
      ))),
      if (jurados.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(24),
          child: Text('Aún no hay jurados designados.'))),
      for (final jurado in jurados) _tarjetaJurado(jurado),
    ]);
  }

  Widget _tarjetaJurado(Map<String, dynamic> jurado) {
    final id = jurado['participanteId'] as int;
    final alcance = alcances[id] ?? 'NINGUNO';
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(jurado['nombre'] as String? ?? 'Jurado', style: const TextStyle(fontWeight: FontWeight.bold)),
        Text(jurado['correo'] as String? ?? ''),
        for (final opcion in const ['NINGUNO', 'TODOS', 'SELECCION'])
          ListTile(
            dense: true, contentPadding: EdgeInsets.zero,
            leading: Icon(alcance == opcion ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                color: Theme.of(context).colorScheme.primary),
            title: Text(opcion == 'NINGUNO' ? 'Ninguno' : opcion == 'TODOS' ? 'Todos los proyectos' : 'Proyectos específicos'),
            onTap: guardando ? null : () => setState(() => alcances[id] = opcion),
          ),
        if (alcance == 'SELECCION') ...[
          if (proyectos.isEmpty) const Text('Aún no hay proyectos o grupos disponibles.'),
          for (final proyecto in proyectos)
            CheckboxListTile(
              dense: true, contentPadding: EdgeInsets.zero,
              title: Text('${proyecto['codigo'] ?? proyecto['id']} · ${proyecto['nombre'] ?? ''}'),
              value: (seleccionados[id] ?? <int>{}).contains(proyecto['id']),
              onChanged: guardando ? null : (valor) => setState(() {
                final ids = seleccionados.putIfAbsent(id, () => <int>{});
                if (valor == true) { ids.add(proyecto['id'] as int); } else { ids.remove(proyecto['id']); }
              }),
            ),
        ],
        Wrap(spacing: 8, children: [
          FilledButton(onPressed: guardando ? null : () => _guardar(id), child: const Text('Guardar asignación')),
          TextButton(onPressed: guardando ? null : () => _quitar(id), child: const Text('Quitar jurado')),
        ]),
      ],
    )));
  }
}
