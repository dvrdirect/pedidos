// Pedidos — frontend (GitHub Pages). Habla con la API de Render.
(function () {
  'use strict';

  var API = (window.PEDIDOS_API_URL || '').replace(/\/$/, '');
  var TOKEN_KEY = 'pedidos_token';
  var USER_KEY = 'pedidos_user';
  var OWNER_NAMES = { rosario: 'Rosario', luis: 'Luis' };

  var token = localStorage.getItem(TOKEN_KEY);
  var user = null;
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch (e) {
    user = null;
  }
  var percents = { ownerPct: 20, gasPct: 10, danielPct: 70 };

  // ---------- Utilidades ----------
  function $(id) {
    return document.getElementById(id);
  }

  function money(n) {
    return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  // Reparto en centavos (misma lógica que el servidor): el resto va para Daniel.
  function splitPreview(amount) {
    var total = Math.round(Number(amount) * 100);
    if (!Number.isFinite(total) || total <= 0) return null;
    var owner = Math.round((total * percents.ownerPct) / 100);
    var gas = Math.round((total * percents.gasPct) / 100);
    var daniel = total - owner - gas;
    return { owner: owner / 100, gas: gas / 100, daniel: daniel / 100 };
  }

  // ---------- API ----------
  function api(path, options) {
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          if (res.status === 401) {
            logout('Tu sesión expiró, vuelve a entrar.');
            throw new Error('No autorizado');
          }
          if (!res.ok) throw new Error(data.error || 'Error del servidor');
          return data;
        });
      })
      .catch(function (err) {
        if (err.message === 'No autorizado') throw err;
        if (err instanceof TypeError) {
          throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
        }
        throw err;
      });
  }

  // ---------- Vistas ----------
  function showView(name) {
    $('view-login').hidden = name !== 'login';
    $('view-force-password').hidden = name !== 'force-password';
    $('view-app').hidden = name !== 'app';
    $('logout-btn').hidden = name !== 'app';
    $('user-label').hidden = name !== 'app';
    if (name === 'app' && user) {
      $('user-label').textContent = user.name + (user.isAdmin ? ' · Administrador' : '');
    }
  }

  function login(userData, newToken) {
    token = newToken;
    user = userData;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (user.mustChangePassword) {
      showView('force-password');
    } else {
      showView('app');
      loadData();
    }
  }

  function logout(message) {
    token = null;
    user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    showView('login');
    if (message) showError($('login-error'), message);
  }

  // ---------- Carga de datos ----------
  function loadData() {
    $('summary-error').hidden = true;
    $('orders-loading').hidden = false;
    $('orders-empty').hidden = true;
    $('orders-error').hidden = true;
    return Promise.all([api('/api/summary'), api('/api/orders'), api('/api/settings')])
      .then(function (results) {
        percents = results[2];
        renderSummary(results[0]);
        renderOrders(results[1].orders || []);
        renderSettingsForm();
      })
      .catch(function (err) {
        if (err.message === 'No autorizado') return;
        showError($('summary-error'), err.message);
        $('orders-loading').hidden = true;
        showError($('orders-error'), err.message);
      });
  }

  function renderSummary(s) {
    $('summary-count').textContent = s.count;
    $('summary-total').textContent = money(s.total);
    $('summary-daniel').textContent = money(s.danielTotal);
    $('summary-owner').textContent = money(s.ownerTotal);
    $('summary-rosario').textContent = money(s.perOwner.rosario);
    $('summary-luis').textContent = money(s.perOwner.luis);
    $('summary-gas').textContent = money(s.gasTotal);
    $('summary-owner-pct').textContent = s.percents.ownerPct;
    $('summary-gas-pct').textContent = s.percents.gasPct;
    $('summary-daniel-pct').textContent = s.percents.danielPct + '% de lo ganado';
    percents = s.percents;
  }

  function renderOrders(orders) {
    var list = $('orders-list');
    list.innerHTML = '';
    $('orders-loading').hidden = true;
    $('orders-empty').hidden = orders.length > 0;
    orders.forEach(function (order) {
      var li = document.createElement('li');
      li.className = 'order';
      li.dataset.id = order.id;
      li.innerHTML =
        '<div class="order-head">' +
          '<span class="order-amount">' + money(order.amount) + '</span>' +
          '<span class="order-date">' + formatDate(order.createdAt) + '</span>' +
        '</div>' +
        (order.note ? '<p class="order-note">' + escapeHtml(order.note) + '</p>' : '') +
        '<p class="order-split">Moto de <strong>' + escapeHtml(OWNER_NAMES[order.owner] || order.owner) + '</strong> · ' +
          'Dueño: <strong>' + money(order.ownerAmount) + '</strong> · ' +
          'Gasolina: <strong>' + money(order.gasAmount) + '</strong> · ' +
          'Daniel: <strong>' + money(order.danielAmount) + '</strong></p>' +
        '<div class="order-actions">' +
          '<button type="button" class="btn btn-ghost btn-small btn-edit" style="color:var(--accent);border-color:var(--border)">Editar</button>' +
          '<button type="button" class="btn btn-danger btn-delete">Borrar</button>' +
        '</div>';
      li.querySelector('.btn-edit').addEventListener('click', function () {
        openEditForm(li, order);
      });
      li.querySelector('.btn-delete').addEventListener('click', function () {
        if (!window.confirm('¿Borrar este pedido de ' + money(order.amount) + '?')) return;
        api('/api/orders/' + order.id, { method: 'DELETE' })
          .then(loadData)
          .catch(function (err) {
            if (err.message !== 'No autorizado') showError($('orders-error'), err.message);
          });
      });
      list.appendChild(li);
    });
  }

  function openEditForm(li, order) {
    var form = document.createElement('form');
    form.className = 'order-edit';
    form.innerHTML =
      '<div class="row">' +
        '<input type="number" inputmode="decimal" min="0.01" step="0.01" value="' + order.amount.toFixed(2) + '" required aria-label="Monto" />' +
        '<select aria-label="Moto de">' +
          '<option value="rosario"' + (order.owner === 'rosario' ? ' selected' : '') + '>Rosario</option>' +
          '<option value="luis"' + (order.owner === 'luis' ? ' selected' : '') + '>Luis</option>' +
        '</select>' +
      '</div>' +
      '<input type="text" maxlength="200" value="' + escapeHtml(order.note) + '" placeholder="Nota (opcional)" aria-label="Nota" />' +
      '<div class="row">' +
        '<button type="submit" class="btn">Guardar</button>' +
        '<button type="button" class="btn btn-ghost btn-cancel" style="color:var(--text);border-color:var(--border)">Cancelar</button>' +
      '</div>';
    var oldActions = li.querySelector('.order-actions');
    if (oldActions) oldActions.style.display = 'none';
    li.appendChild(form);
    form.querySelector('.btn-cancel').addEventListener('click', function () {
      form.remove();
      if (oldActions) oldActions.style.display = '';
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var inputs = form.querySelectorAll('input, select');
      api('/api/orders/' + order.id, {
        method: 'PATCH',
        body: { amount: Number(inputs[0].value), owner: inputs[1].value, note: inputs[2].value },
      })
        .then(loadData)
        .catch(function (err) {
          if (err.message !== 'No autorizado') showError($('orders-error'), err.message);
        });
    });
  }

  // ---------- Ajustes del reparto (admin) ----------
  function renderSettingsForm() {
    var card = $('settings-card');
    card.hidden = !(user && user.isAdmin);
    if (!card.hidden) {
      $('settings-owner').value = percents.ownerPct;
      $('settings-gas').value = percents.gasPct;
      updateDanielPctLabel();
    }
  }

  function updateDanielPctLabel() {
    var owner = Number($('settings-owner').value) || 0;
    var gas = Number($('settings-gas').value) || 0;
    $('settings-daniel').textContent = (100 - owner - gas) + '%';
  }

  // ---------- Eventos ----------
  $('toggle-password').addEventListener('click', function () {
    var input = $('login-password');
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? 'Ocultar' : 'Mostrar';
  });

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    showError($('login-error'), null);
    var btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    api('/api/auth/login', {
      method: 'POST',
      body: { username: $('login-username').value.trim(), password: $('login-password').value },
    })
      .then(function (data) {
        login(data.user, data.token);
      })
      .catch(function (err) {
        if (err.message !== 'No autorizado') showError($('login-error'), err.message);
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      });
  });

  $('force-password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var current = $('force-current').value;
    var next = $('force-new').value;
    var confirm = $('force-confirm').value;
    if (next !== confirm) {
      showError($('force-password-error'), 'La contraseña nueva no coincide con la confirmación.');
      return;
    }
    showError($('force-password-error'), null);
    api('/api/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } })
      .then(function (data) {
        user = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        showView('app');
        loadData();
      })
      .catch(function (err) {
        if (err.message !== 'No autorizado') showError($('force-password-error'), err.message);
      });
  });

  $('logout-btn').addEventListener('click', function () {
    logout();
  });

  // Vista previa del reparto al escribir el monto.
  $('add-amount').addEventListener('input', function () {
    var preview = splitPreview(this.value);
    var el = $('add-preview');
    if (!preview) {
      el.hidden = true;
      return;
    }
    var ownerName = OWNER_NAMES[$('add-owner').value] || '';
    el.textContent =
      'Reparto: ' + ownerName + ' ' + money(preview.owner) +
      ' · Gasolina ' + money(preview.gas) +
      ' · Daniel ' + money(preview.daniel);
    el.hidden = false;
  });

  $('add-owner').addEventListener('change', function () {
    $('add-amount').dispatchEvent(new Event('input'));
  });

  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    showError($('add-error'), null);
    api('/api/orders', {
      method: 'POST',
      body: {
        amount: Number($('add-amount').value),
        owner: $('add-owner').value,
        note: $('add-note').value.trim(),
      },
    })
      .then(function () {
        $('add-form').reset();
        $('add-preview').hidden = true;
        loadData();
      })
      .catch(function (err) {
        if (err.message !== 'No autorizado') showError($('add-error'), err.message);
      });
  });

  $('settings-owner').addEventListener('input', updateDanielPctLabel);
  $('settings-gas').addEventListener('input', updateDanielPctLabel);

  $('settings-form').addEventListener('submit', function (e) {
    e.preventDefault();
    showError($('settings-error'), null);
    $('settings-ok').hidden = true;
    api('/api/settings', {
      method: 'PATCH',
      body: { ownerPct: Number($('settings-owner').value), gasPct: Number($('settings-gas').value) },
    })
      .then(function (data) {
        percents = data;
        $('settings-ok').hidden = false;
        loadData();
      })
      .catch(function (err) {
        if (err.message !== 'No autorizado') showError($('settings-error'), err.message);
      });
  });

  $('change-password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var next = $('change-new').value;
    var confirm = $('change-confirm').value;
    if (next !== confirm) {
      showError($('change-password-error'), 'La contraseña nueva no coincide con la confirmación.');
      return;
    }
    showError($('change-password-error'), null);
    $('change-password-ok').hidden = true;
    api('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: $('change-current').value, newPassword: next },
    })
      .then(function (data) {
        user = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        $('change-password-form').reset();
        $('change-password-ok').hidden = false;
      })
      .catch(function (err) {
        if (err.message !== 'No autorizado') showError($('change-password-error'), err.message);
      });
  });

  // ---------- Inicio ----------
  if (!API) {
    showError($('login-error'), 'Falta configurar la URL de la API en config.js.');
    showView('login');
  } else if (token && user) {
    if (user.mustChangePassword) {
      showView('force-password');
    } else {
      showView('app');
      loadData();
    }
  } else {
    showView('login');
  }
})();
