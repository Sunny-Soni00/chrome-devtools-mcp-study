async function render() {
  const res = await fetch('/api/todos');
  const data = await res.json();
  const list = document.getElementById('list');
  list.innerHTML = data.items
    .map((t) => `<li>${t.done ? '✅' : '⬜'} ${t.title}</li>`)
    .join('');
}
render();
