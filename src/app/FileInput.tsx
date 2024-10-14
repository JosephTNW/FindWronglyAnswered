import React from "react";
import Papa from "papaparse";

interface ParsedData {
  [key: string]: string | number; // Generic object type
}

const FileInput = () => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<ParsedData>, file: File) => {
            let end_result = [];
            
            results.data.map((row) => {
                const questionColumns = Object.keys(row).filter(key => key.includes('Q'));
                const zeroValueQuestions = questionColumns
                    .filter(column => row[column] == 0)
                    .map(column => column.replace('Q. ', '').replace(/ \/[\d.]+$/, ''));
                const name = row['First name'] + ' ' + row['Surname'];

                end_result.push({
                    name: name,
                    wronglyAnswered: zeroValueQuestions
                });
            });

            const csv = Papa.unparse(end_result);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'wronglyAnswered.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        error: (error: Papa.ParseError, file: File) => {
          console.log("Parsing error:", error, file);
        },
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      console.log(file);
      // Handle file processing here
    }
  };

  return (
    <>
      <input
        type="file"
        onChange={handleFileChange}
        className="hidden"
        id="fileInput"
      />
      <label
        htmlFor="fileInput"
        className="cursor-pointer border border-dashed border-gray-400 p-4 rounded-lg text-center"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        Click to upload
      </label>
    </>
  );
};

export default FileInput;
