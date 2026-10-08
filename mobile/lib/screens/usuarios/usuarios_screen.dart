import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';

class UsuariosScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const UsuariosScreen({super.key, this.onBack});

  @override
  State<UsuariosScreen> createState() => _UsuariosScreenState();
}

class _UsuariosScreenState extends State<UsuariosScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Estado Usuarios
  List<Map<String, dynamic>> _usuarios = [];
  bool _isLoadingUsuarios = true;
  String _searchQuery = '';
  String _roleFilter = 'TODOS';
  int? _processingUserId;

  // Estado Permisos
  List<Map<String, dynamic>> _permisos = [];
  bool _isLoadingPermisos = false;
  String _selectedPermisoRole = 'DOCENTE';

  final List<String> _roles = ['ADMIN', 'DOCENTE', 'JURADO', 'ESTUDIANTE'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadUsuarios();
    _loadPermisos();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadUsuarios() async {
    setState(() => _isLoadingUsuarios = true);
    final users = await ApiService.getAdminUsers(query: _searchQuery);
    if (mounted) {
      setState(() {
        _usuarios = users;
        _isLoadingUsuarios = false;
      });
    }
  }

  Future<void> _loadPermisos() async {
    setState(() => _isLoadingPermisos = true);
    final perms = await ApiService.getPermisos();
    if (mounted) {
      setState(() {
        _permisos = perms;
        _isLoadingPermisos = false;
      });
    }
  }

  Future<void> _cambiarRol(int userId, String nuevoRol) async {
    setState(() => _processingUserId = userId);
    final ok = await ApiService.updateUserRole(userId, nuevoRol);
    if (mounted) {
      setState(() => _processingUserId = null);
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Rol de usuario actualizado a $nuevoRol'),
          ),
        );
        _loadUsuarios();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('Error al actualizar el rol de usuario.'),
          ),
        );
      }
    }
  }

  Future<void> _toggleEstado(int userId, String estadoActual) async {
    final nuevoEstado = estadoActual == 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    setState(() => _processingUserId = userId);
    final ok = await ApiService.updateUserStatus(userId, nuevoEstado);
    if (mounted) {
      setState(() => _processingUserId = null);
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: nuevoEstado == 'ACTIVO' ? const Color(0xFF10B981) : AppTheme.danger,
            content: Text('Estado de usuario cambiado a $nuevoEstado'),
          ),
        );
        _loadUsuarios();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('Error al cambiar el estado del usuario.'),
          ),
        );
      }
    }
  }

  Future<void> _togglePermiso(String rol, String modulo, bool puedeVer, bool puedeEditar) async {
    final ok = await ApiService.updatePermiso(rol, modulo, puedeVer, puedeEditar);
    if (mounted) {
      if (ok) {
        _loadPermisos();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            duration: Duration(milliseconds: 1500),
            content: Text('Permiso actualizado en la matriz de acceso'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('Error al actualizar permiso en el servidor.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded),
                onPressed: widget.onBack,
              )
            : null,
        title: const Text('Gestión de Usuarios & Permisos'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.accent,
          unselectedLabelColor: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft,
          indicatorColor: AppTheme.accent,
          indicatorWeight: 3,
          tabs: const [
            Tab(icon: Icon(Icons.people_alt_rounded), text: 'Usuarios'),
            Tab(icon: Icon(Icons.shield_rounded), text: 'Matriz de Permisos'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTabUsuarios(isDark),
          _buildTabPermisos(isDark),
        ],
      ),
    );
  }

  Widget _buildTabUsuarios(bool isDark) {
    final filtrados = _usuarios.where((u) {
      final nombre = '${u['nombre'] ?? ""} ${u['apellido'] ?? ""}'.toLowerCase();
      final email = (u['email'] ?? '').toString().toLowerCase();
      final rol = (u['rol'] ?? '').toString();
      final q = _searchQuery.toLowerCase().trim();

      final matchesQuery = q.isEmpty || nombre.contains(q) || email.contains(q);
      final matchesRole = _roleFilter == 'TODOS' || rol == _roleFilter;
      return matchesQuery && matchesRole;
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadUsuarios,
      color: AppTheme.accent,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Banner institucional
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.accentSoft,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.admin_panel_settings_rounded, color: AppTheme.accent, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Panel Administrativo: Administra los roles institucionales y el estado de activación de todas las cuentas universitarias.',
                      style: TextStyle(fontSize: 11.5, color: AppTheme.accentDark, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Buscador en tiempo real
            TextField(
              decoration: InputDecoration(
                hintText: 'Buscar por nombre, apellido o correo...',
                prefixIcon: const Icon(Icons.search_rounded),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                filled: true,
                fillColor: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val);
              },
            ),
            const SizedBox(height: 10),

            // Filtros de Rol
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _RoleFilterChip(
                    label: 'Todos',
                    selected: _roleFilter == 'TODOS',
                    onSelected: () => setState(() => _roleFilter = 'TODOS'),
                  ),
                  const SizedBox(width: 6),
                  _RoleFilterChip(
                    label: 'Admin',
                    selected: _roleFilter == 'ADMIN',
                    onSelected: () => setState(() => _roleFilter = 'ADMIN'),
                  ),
                  const SizedBox(width: 6),
                  _RoleFilterChip(
                    label: 'Docente',
                    selected: _roleFilter == 'DOCENTE',
                    onSelected: () => setState(() => _roleFilter = 'DOCENTE'),
                  ),
                  const SizedBox(width: 6),
                  _RoleFilterChip(
                    label: 'Jurado',
                    selected: _roleFilter == 'JURADO',
                    onSelected: () => setState(() => _roleFilter = 'JURADO'),
                  ),
                  const SizedBox(width: 6),
                  _RoleFilterChip(
                    label: 'Estudiante',
                    selected: _roleFilter == 'ESTUDIANTE',
                    onSelected: () => setState(() => _roleFilter = 'ESTUDIANTE'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'USUARIOS REGISTRADOS (${filtrados.length})',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.6,
                    color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
                  ),
                ),
                if (_isLoadingUsuarios)
                  const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent)),
              ],
            ),
            const SizedBox(height: 10),

            if (_isLoadingUsuarios && _usuarios.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppTheme.accent),
                ),
              )
            else if (filtrados.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                child: Column(
                  children: [
                    Icon(Icons.person_search_rounded, size: 48, color: isDark ? AppTheme.darkLine : AppTheme.line),
                    const SizedBox(height: 12),
                    const Text(
                      'No se encontraron usuarios con ese criterio.',
                      style: TextStyle(fontSize: 13, color: AppTheme.inkSoft),
                    ),
                  ],
                ),
              )
            else
              ...filtrados.map((user) {
                final id = (user['id'] as num?)?.toInt() ?? 0;
                final nombre = '${user['nombre'] ?? ""} ${user['apellido'] ?? ""}'.trim();
                final email = user['email'] ?? '';
                final rol = (user['rol'] ?? 'ESTUDIANTE').toString();
                final estado = (user['estado'] ?? 'ACTIVO').toString();
                final isActivo = estado == 'ACTIVO';
                final isProcessing = _processingUserId == id;

                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: rol == 'ADMIN'
                                  ? AppTheme.accentSoft
                                  : (rol == 'DOCENTE' ? AppTheme.sealSoft : (isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken)),
                              child: Text(
                                nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: rol == 'ADMIN' ? AppTheme.accentDark : (rol == 'DOCENTE' ? AppTheme.seal : AppTheme.inkSoft),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    nombre.isNotEmpty ? nombre : email,
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                    ),
                                  ),
                                  Text(
                                    email,
                                    style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                                  ),
                                ],
                              ),
                            ),
                            // Badge Estado
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isActivo ? const Color(0xFF10B981).withValues(alpha: 0.15) : AppTheme.dangerSoft,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                estado,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isActivo ? const Color(0xFF10B981) : AppTheme.danger,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        const Divider(height: 1),
                        const SizedBox(height: 8),

                        // Acciones: Modificar Rol & Toggle Estado
                        Row(
                          children: [
                            const Text('Rol: ', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              decoration: BoxDecoration(
                                color: isDark ? AppTheme.darkPaperSunken : AppTheme.paperSunken,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: isDark ? AppTheme.darkLine : AppTheme.line),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: rol,
                                  isDense: true,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                  ),
                                  items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                                  onChanged: isProcessing ? null : (val) {
                                    if (val != null && val != rol) {
                                      _cambiarRol(id, val);
                                    }
                                  },
                                ),
                              ),
                            ),
                            const Spacer(),
                            if (isProcessing)
                              const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            else
                              TextButton.icon(
                                onPressed: () => _toggleEstado(id, estado),
                                icon: Icon(
                                  isActivo ? Icons.block_rounded : Icons.check_circle_outline_rounded,
                                  size: 15,
                                  color: isActivo ? AppTheme.danger : const Color(0xFF10B981),
                                ),
                                label: Text(
                                  isActivo ? 'Suspender' : 'Activar Cuenta',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isActivo ? AppTheme.danger : const Color(0xFF10B981),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildTabPermisos(bool isDark) {
    final modulosList = ['CONVOCATORIAS', 'MOODLE', 'DOCUMENTOS', 'SPEEDGRADER', 'USUARIOS'];

    final permisosDelRol = _permisos.where((p) => p['rol'] == _selectedPermisoRole).toList();

    return RefreshIndicator(
      onRefresh: _loadPermisos,
      color: AppTheme.accent,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.sealSoft,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.seal.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.security_rounded, color: AppTheme.seal, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Matriz de Permisos Institucionales: Configura los privilegios de visualización y edición por rol para cada módulo de la plataforma.',
                      style: TextStyle(fontSize: 11.5, color: AppTheme.seal, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Selector del Rol a Configurar
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _roles.map((r) {
                  final isSel = _selectedPermisoRole == r;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(r, style: TextStyle(fontSize: 12, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                      selected: isSel,
                      selectedColor: AppTheme.sealSoft,
                      labelStyle: TextStyle(color: isSel ? AppTheme.seal : AppTheme.inkSoft),
                      onSelected: (_) => setState(() => _selectedPermisoRole = r),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),

            Text(
              'PERMISOS PARA EL ROL: $_selectedPermisoRole',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
                color: isDark ? AppTheme.darkInkSoft : AppTheme.inkFaint,
              ),
            ),
            const SizedBox(height: 10),

            if (_isLoadingPermisos && _permisos.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppTheme.accent),
                ),
              )
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: modulosList.map((modulo) {
                      final p = permisosDelRol.firstWhere(
                        (item) => item['modulo'] == modulo,
                        orElse: () => {'rol': _selectedPermisoRole, 'modulo': modulo, 'puedeVer': false, 'puedeEditar': false},
                      );

                      final puedeVer = p['puedeVer'] as bool? ?? false;
                      final puedeEditar = p['puedeEditar'] as bool? ?? false;

                      return Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(color: isDark ? AppTheme.darkLine : AppTheme.lineSoft)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    modulo,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: isDark ? AppTheme.darkInk : AppTheme.ink,
                                    ),
                                  ),
                                  Text(
                                    _getModuloDescription(modulo),
                                    style: TextStyle(fontSize: 10.5, color: isDark ? AppTheme.darkInkSoft : AppTheme.inkSoft),
                                  ),
                                ],
                              ),
                            ),
                            // Check Puede Ver
                            Column(
                              children: [
                                const Text('Ver', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                Checkbox(
                                  value: puedeVer,
                                  activeColor: AppTheme.accent,
                                  onChanged: (val) {
                                    if (val != null) {
                                      _togglePermiso(_selectedPermisoRole, modulo, val, puedeEditar);
                                    }
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(width: 8),
                            // Check Puede Editar
                            Column(
                              children: [
                                const Text('Editar', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                Checkbox(
                                  value: puedeEditar,
                                  activeColor: AppTheme.seal,
                                  onChanged: (val) {
                                    if (val != null) {
                                      _togglePermiso(_selectedPermisoRole, modulo, puedeVer, val);
                                    }
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  String _getModuloDescription(String modulo) {
    switch (modulo) {
      case 'CONVOCATORIAS':
        return 'Creación, edición y publicación de ferias';
      case 'MOODLE':
        return 'Aulas virtuales, módulos y tareas';
      case 'DOCUMENTOS':
        return 'Repositorio colaborativo y Asistente IA';
      case 'SPEEDGRADER':
        return 'Evaluación y calificación de entregas';
      case 'USUARIOS':
        return 'Gestión de cuentas y matriz de acceso';
      default:
        return 'Módulo del sistema institucional';
    }
  }
}

class _RoleFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onSelected;

  const _RoleFilterChip({required this.label, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11.5, fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
      selected: selected,
      selectedColor: AppTheme.accentSoft,
      labelStyle: TextStyle(color: selected ? AppTheme.accentDark : AppTheme.inkSoft),
      onSelected: (_) => onSelected(),
    );
  }
}
