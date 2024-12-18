import { PythonShell } from 'python-shell';

const text = "Ciao! Come stai? Oggi è una bella giornata.";
PythonShell.run('process.py', { args: [text] }, (err, results) => {
    if (err) console.log(err);
    console.log(JSON.parse(results[0])); // Processed sentences
});

