import React, { useState } from "react";
import Papa from "papaparse";

interface ParsedData {
  [key: string]: string | number;
}

interface StudentResult {
  name: string;
  correctAnswers: string[];
  wrongAnswers: string[];
}

interface Question {
  number: number;
  text: string;
  options: string[];
  correctAnswer: string;
}

const FileInput = () => {
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [questions, setQuestions] = useState<Map<number, Question>>(new Map());
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Parse Aiken format questions file
  const parseAikenFormat = (text: string): Map<number, Question> => {
    const questionsMap = new Map<number, Question>();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let questionNumber = 1;
    let i = 0;
    
    while (i < lines.length) {
      // Find question text (everything before options)
      let questionText = '';
      while (i < lines.length && !lines[i].match(/^[A-E]\)/)) {
        if (!lines[i].startsWith('ANSWER:')) {
          questionText += (questionText ? ' ' : '') + lines[i];
        }
        i++;
      }
      
      // Parse options A-E
      const options: string[] = [];
      while (i < lines.length && lines[i].match(/^[A-E]\)/)) {
        options.push(lines[i]);
        i++;
      }
      
      // Parse answer
      let correctAnswer = '';
      if (i < lines.length && lines[i].startsWith('ANSWER:')) {
        correctAnswer = lines[i].replace('ANSWER:', '').trim();
        i++;
      }
      
      // Only add if we have valid question data
      if (questionText && options.length > 0) {
        questionsMap.set(questionNumber, {
          number: questionNumber,
          text: questionText,
          options: options,
          correctAnswer: correctAnswer
        });
        questionNumber++;
      }
    }
    
    return questionsMap;
  };

  // Handle quiz results CSV upload
  const handleQuizResultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse<ParsedData>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<ParsedData>) => {
          const studentResults: StudentResult[] = [];
          
          results.data.forEach(row => {
            const questionColumns = Object.keys(row).filter(key => key.includes('Q'));
            
            // Get all question numbers
            const allQuestions = questionColumns.map(column => 
              column.replace('Q. ', '').replace(/ \/[\d.]+$/, '')
            );
            
            // Questions with score 0 are wrong
            const wrongAnswers = questionColumns
              .filter(column => row[column] == 0)
              .map(column => column.replace('Q. ', '').replace(/ \/[\d.]+$/, ''));
            
            // Correct answers are the ones not in wrong answers
            const correctAnswers = allQuestions.filter(q => !wrongAnswers.includes(q));
            
            const name = row['First name'] + ' ' + row['Last name'];

            studentResults.push({
              name: name,
              correctAnswers: correctAnswers,
              wrongAnswers: wrongAnswers
            });
          });
          
          setStudents(studentResults);
        },
        error: (error: Error) => {
          console.error(error);
          alert('Error parsing quiz results file');
        },
      });
    }
  };

  // Handle questions list upload
  const handleQuestionsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsedQuestions = parseAikenFormat(text);
        setQuestions(parsedQuestions);
      };
      reader.onerror = () => {
        alert('Error reading questions file');
      };
      reader.readAsText(file);
    }
  };

  // Download wrongly answered CSV (original functionality)
  const downloadWrongAnswersCSV = () => {
    if (students.length === 0) {
      alert('Please upload quiz results first');
      return;
    }

    const csvData = students.map(student => ({
      name: student.name,
      wronglyAnswered: student.wrongAnswers.join(', ')
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'wronglyAnswered.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get question details
  const getQuestionDisplay = (questionNum: string) => {
    const num = parseInt(questionNum);
    const question = questions.get(num);
    
    if (question) {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="font-medium text-gray-800">{question.text}</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {question.options.map((option, idx) => (
              <li key={idx} className={option.startsWith(question.correctAnswer) ? 'text-green-600 font-medium' : ''}>
                {option}
              </li>
            ))}
          </ul>
          {question.correctAnswer && (
            <p className="mt-2 text-sm font-semibold text-green-700">
              Correct Answer: {question.correctAnswer}
            </p>
          )}
        </div>
      );
    }
    
    return <span className="text-gray-600">Question #{questionNum}</span>;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* File Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Quiz Results Analyzer</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Quiz Results Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Quiz Results (CSV)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleQuizResultsChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            {students.length > 0 && (
              <p className="mt-2 text-sm text-green-600">
                ✓ {students.length} students loaded
              </p>
            )}
          </div>

          {/* Questions List Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Questions List (Aiken format TXT)
            </label>
            <input
              type="file"
              accept=".txt"
              onChange={handleQuestionsFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-green-50 file:text-green-700
                hover:file:bg-green-100
                cursor-pointer"
            />
            {questions.size > 0 && (
              <p className="mt-2 text-sm text-green-600">
                ✓ {questions.size} questions loaded
              </p>
            )}
          </div>
        </div>

        {/* Download CSV Button */}
        {students.length > 0 && (
          <button
            onClick={downloadWrongAnswersCSV}
            className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            Download Wrong Answers CSV
          </button>
        )}
      </div>

      {/* Student Search Section */}
      {students.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Search Student</h3>
          
          <input
            type="text"
            placeholder="Type student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
          />

          {searchQuery && (
            <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 rounded-md">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedStudent(student);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors text-gray-800 font-medium"
                  >
                    {student.name}
                  </button>
                ))
              ) : (
                <p className="px-4 py-2 text-gray-600 font-medium">No students found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Details Section */}
      {selectedStudent && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-2xl font-bold text-gray-800">
              {selectedStudent.name}
            </h3>
            <button
              onClick={() => setSelectedStudent(null)}
              className="px-4 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Correct Answers</p>
              <p className="text-3xl font-bold text-green-800">
                {selectedStudent.correctAnswers.length}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 font-medium">Wrong Answers</p>
              <p className="text-3xl font-bold text-red-800">
                {selectedStudent.wrongAnswers.length}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Score</p>
              <p className="text-3xl font-bold text-blue-800">
                {((selectedStudent.correctAnswers.length / 
                  (selectedStudent.correctAnswers.length + selectedStudent.wrongAnswers.length)) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Correct Answers */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
              <span className="mr-2">✅</span>
              Correctly Answered Questions ({selectedStudent.correctAnswers.length})
            </h4>
            <div className="space-y-3">
              {selectedStudent.correctAnswers.map((qNum, idx) => (
                <div key={idx} className="p-3 bg-green-50 rounded-md border border-green-200">
                  <p className="font-medium text-green-800">Question #{qNum}</p>
                  {getQuestionDisplay(qNum)}
                </div>
              ))}
            </div>
          </div>

          {/* Wrong Answers */}
          <div>
            <h4 className="text-lg font-semibold text-red-700 mb-3 flex items-center">
              <span className="mr-2">❌</span>
              Wrongly Answered Questions ({selectedStudent.wrongAnswers.length})
            </h4>
            <div className="space-y-3">
              {selectedStudent.wrongAnswers.map((qNum, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="font-medium text-red-800">Question #{qNum}</p>
                  {getQuestionDisplay(qNum)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileInput;
