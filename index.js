const http = require('http');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { DateTime } = require('luxon');

const bd = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'checklist',
  port: 3305
});

bd.connect((err) => {
  if (err) {
    console.error('Error de conexión a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  // Servir CSS
  if (url === '/style.css') {
    fs.readFile(path.join(__dirname, 'style.css'), (err, data) => {
      if (err) {
        res.statusCode = 500;
        return res.end('Error al leer el archivo CSS.');
      }
      res.setHeader('Content-Type', 'text/css');
      return res.end(data);
    });
    return;
  }

  // Página principal
  if ((url === '/' || url === '/?') && method === 'GET') {
    fs.readFile(path.join(__dirname, 'index1.html'), (err, data) => {
      if (err) {
        res.statusCode = 500;
        return res.end('Error al leer el archivo HTML.');
      }
      res.setHeader('Content-Type', 'text/html');
      return res.end(data);
    });
    return;
  }

  // Página de registro
  if (url === '/registro' && method === 'GET') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.statusCode = 500;
        return res.end('Error al leer el archivo HTML.');
      }
      res.setHeader('Content-Type', 'text/html');
      return res.end(data);
    });
    return;
  }
  // Página de registro
  if (url === '/admin' && method === 'GET') {
    fs.readFile(path.join(__dirname, 'index2.html'), (err, data) => {
      if (err) {
        res.statusCode = 500;
        return res.end('Error al leer el archivo HTML.');
      }
      res.setHeader('Content-Type', 'text/html');
      return res.end(data);
    });
    return;
  }
  // Servir imágenes
  if (url.startsWith('/imagen/')) {
    const imgPath = path.join(__dirname, url);
    fs.readFile(imgPath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Imagen no encontrada');
        return;
      }
      res.setHeader('Content-Type', 'image/jpeg');
      res.end(data);
    });
    return;
  
}

//Inicio de sesión
const usuarios = [
  { nombre: 'admin_usb', contrasena: '1234' }
];

if (url === '/login' && method === 'POST') {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', () => {
    const params = querystring.parse(body);
    const usuario = params.id; // Obtiene el usuario del formulario
    const contrasena = params.contrasena; // Obtiene la contraseña del formulario

    // Validar usuario y contraseña
    const usuarioValido = usuarios.find(u => u.nombre === usuario && u.contrasena === contrasena);

    if (usuarioValido) {
      // Si las credenciales son correctas, servir index4.html
      fs.readFile(path.join(__dirname, 'index4.html'), (err, data) => {
        if (err) {
          res.statusCode = 500;
          return res.end('Error al leer el archivo HTML.');
        }
        res.setHeader('Content-Type', 'text/html');
        res.end(data);
      });
    } else {
      // Si las credenciales son incorrectas, mostrar mensaje de error
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>Usuario o contraseña incorrectos</h1><a href="/admin">Intentar de nuevo</a>');
    }
  });
  return;

}
  // Ruta POST para registrar asistencia
  if (url === '/buscar' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      const params = querystring.parse(body);
      const idestudiante = params.id;
      const idmateria = params.materia;

      if (!idestudiante || !idmateria) {
        res.statusCode = 400;
        return res.end('Faltan parámetros requeridos.');
      }

      bd.query('SELECT nombremateria FROM materias WHERE idmateria = ?', [idmateria], (err, materiaRes) => {
        if (err || materiaRes.length === 0) {
          res.statusCode = 400;
          return res.end('Materia no encontrada.');
        }

        const nombreMateria = materiaRes[0].nombremateria;

        bd.query('SELECT idasignacion FROM asignacion WHERE idmateria = ?', [idmateria], (err, asignacionRes) => {
          if (err || asignacionRes.length === 0) {
            res.statusCode = 400;
            return res.end('Asignación no encontrada.');
          }

          const idasignacion = asignacionRes[0].idasignacion;

          bd.query('SELECT * FROM inscripcion WHERE idestudiante = ? AND idasignacion = ?', [idestudiante, idasignacion], (err, inscRes) => {
            if (err || inscRes.length === 0) {
              res.statusCode = 400;
              return res.end('Estudiante no inscrito en la materia.');
            }

            const idinscripcion = inscRes[0].idinscripcion;

            bd.query('SELECT nombre, correoins FROM estudiante WHERE idestudiante = ?', [idestudiante], (err, estRes) => {
              if (err || estRes.length === 0) {
                res.statusCode = 400;
                return res.end('Error al recuperar información del estudiante.');
              }

              const fechaActual = DateTime.now().setZone('America/Bogota').toFormat('yyyy-MM-dd HH:mm:ss');
              const nombreEstudiante = estRes[0].nombre;
              const correo = estRes[0].correoins;

              bd.query('INSERT INTO asistencias (idasignacion, fecha, idinscripcion) VALUES (?, ?, ?)', [idasignacion, fechaActual, idinscripcion], (err) => {
                if (err) {
                  res.statusCode = 500;
                  return res.end('Error al registrar la asistencia.');
                }
              fs.readFile(path.join(__dirname, 'index3.html'), 'utf8', (err, data) => {
                  if (err) {
                    res.statusCode = 500;
                    return res.end('Error al leer el archivo HTML.');
                  }
                const html = data
                .replace('{{idestudiante}}', idestudiante)
                .replace('{{nombreEstudiante}}', nombreEstudiante)
                .replace('{{correo}}', correo)
                .replace('{{nombreMateria}}', nombreMateria)
                .replace('{{fechaActual}}', fechaActual);
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
              });
            });
          });
        });
      });
    });
    });
    return;
  }

  // Si no coincide ninguna ruta
  res.statusCode = 404;
  res.end('Página no encontrada.');
});

// Puerto
server.listen(8180, () => {
  console.log('Servidor corriendo en http://localhost:8180');
});
