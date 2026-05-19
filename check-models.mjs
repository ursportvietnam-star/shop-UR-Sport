const key = 'AIzaSyAf4rZHm53ZUxbmx1lqEStNaa4fU699OgI';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
fetch(url)
  .then(res => res.json())
  .then(data => {
     if(data.models) {
        console.log(data.models.map(m => m.name).join('\n'));
     } else {
        console.log(JSON.stringify(data, null, 2));
     }
  });
