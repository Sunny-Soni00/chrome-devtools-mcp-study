async function render() {
  const res = await fetch('/api/todo-list');
  const data = await res.json();
  const list = document.getElementById('list');
  list.innerHTML = data.todos
    .map((t) => `<li>${t.done ? '✅' : '⬜'} ${t.title}</li>`)
    .join('');
}
render();
