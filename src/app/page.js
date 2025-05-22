"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Import next/image

export default function HomePage() {
  const [mottos, setMottos] = useState([]);
  const [newMotto, setNewMotto] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(""); // For displaying API errors
  const [userMotto, setUserMotto] = useState(null); // To store the logged-in user's motto
  const [isEditing, setIsEditing] = useState(false); // To toggle between submit/update mode
  const [raffledMotto, setRaffledMotto] = useState(null); // To store the motto assigned to the logged-in user
  const [raffleError, setRaffleError] = useState("");
  const [isRaffleLoading, setIsRaffleLoading] = useState(false);

  // Fetch mottos, user's raffle result, and get loggedInUser from localStorage
  useEffect(() => {
    const user = localStorage.getItem("loggedInUser");
    if (user) {
      setLoggedInUser(user);
      fetchUserRaffleResult(user); // Fetch raffle result when user is known
    }
    fetchMottos(); 
  }, []); // Initial fetch

  // Effect to find and set the user's motto if they log in or mottos list updates
  useEffect(() => {
    if (loggedInUser && mottos.length > 0) {
      const foundMotto = mottos.find(motto => motto.name && motto.name.toLowerCase() === loggedInUser.toLowerCase());
      if (foundMotto) {
        setUserMotto(foundMotto);
        setNewMotto(foundMotto.text); // Pre-fill input for editing
        setIsEditing(true); // Set to editing mode
      } else {
        setUserMotto(null);
        setNewMotto(""); // Clear input if no motto found for user
        setIsEditing(false);
      }
    } else {
      setUserMotto(null); // Clear if not logged in or no mottos
      setNewMotto("");
      setIsEditing(false);
    }
  }, [loggedInUser, mottos]);

  const fetchMottos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mottos/get');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch mottos');
      }
      const data = await res.json();
      setMottos(data);
      setError(""); // Clear previous errors on successful fetch
    } catch (err) {
      console.error("Fetch mottos error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRaffleResult = async (username) => {
    if (!username) return;
    // No need to set loading here, can be silent or part of a general page load state
    try {
      const res = await fetch(`/api/raffle/results?username=${encodeURIComponent(username.toLowerCase())}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.assigned_motto_text) {
          setRaffledMotto(data.assigned_motto_text);
        } else {
          setRaffledMotto(null); // No result for this user or raffle not run
        }
      } else if (res.status !== 404) { // 404 is expected if no result, don't treat as error
        const errorData = await res.json();
        console.error("Fetch raffle result error:", errorData.error || 'Failed to fetch raffle result');
        // Optionally set a state to show this error, but might be too noisy
      }
    } catch (err) {
      console.error("Fetch raffle result error:", err);
    }
  };

  const handleMottoSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newMotto.trim() && loggedInUser) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/mottos/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mottoText: newMotto, submitterName: loggedInUser }),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || 'Failed to submit motto');
        }
        
        setSubmitted(true);
        setShowConfetti(true);
        // After successful submission/update, re-fetch all mottos to update the list and user's motto
        await fetchMottos(); 
        // setNewMotto will be reset by the useEffect that watches loggedInUser and mottos

        setTimeout(() => {
          setSubmitted(false);
          setShowConfetti(false);
        }, 3000);

      } catch (err) {
        console.error("Submit motto error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    } else if (!loggedInUser) {
      alert("Please log in to submit or update a motto.");
    }
  };

  const uniqueSubmitters = mottos.length > 0 
    ? [...new Set(mottos.map(motto => motto.name).filter(name => name))] // Filter out undefined/empty names
    : [];

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    setLoggedInUser(null);
    setUserMotto(null); // Clear user-specific motto state
    setNewMotto(""); // Clear input field
    setIsEditing(false); // Reset editing mode
    setRaffledMotto(null); // Clear raffled motto on logout
    setRaffleError("");
    // Mottos list (all mottos) remains as is, or could be re-fetched if desired
  };

  const handleStartRaffle = async () => {
    if (loggedInUser?.toLowerCase() !== 'antonia') {
      setRaffleError("You are not authorized to start the raffle.");
      return;
    }
    setIsRaffleLoading(true);
    setRaffleError("");
    try {
      const res = await fetch('/api/raffle/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initiatingUser: loggedInUser }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to start raffle');
      }
      alert('Raffle started successfully! Results have been saved.');
      // After raffle, fetch results for the current user if they are logged in
      if (loggedInUser) {
        await fetchUserRaffleResult(loggedInUser);
      }
      // Optionally, could also re-fetch all mottos if the raffle somehow changes them (not in current design)
    } catch (err) {
      console.error("Start raffle error:", err);
      setRaffleError(err.message);
      alert(`Raffle Error: ${err.message}`); // Also show alert for immediate feedback
    } finally {
      setIsRaffleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-yellow-300 rounded-full animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * -50}%`, // Start above the screen
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                opacity: Math.random() * 0.5 + 0.5,
              }}
            />
          ))}
        </div>
      )}
      <nav className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
        <h1 className="text-3xl font-bold">MottoParty!</h1>
        <div> 
          {loggedInUser ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm">Welcome, {loggedInUser}!</span>
              <button 
                onClick={handleLogout}
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-opacity-90 transition-colors mr-2">
              Login/Register
            </Link>
          )}
          {/* <Link href="/game" className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-opacity-90 transition-colors">
            Play Minigame
          </Link> */}
        </div>
      </nav>

      <main className="text-center z-10">
        <h2 className="text-5xl font-extrabold mb-8 animate-bounce">
          Oops! I thought the motto was...
        </h2>
        <p className="text-xl mb-12">
          Hand in your most creative, funny, or outrageous party mottos!
        </p>

        {/* User's motto status message - NEW */}
        {loggedInUser && (
          <div className="my-6 text-center"> {/* Increased margin top/bottom */}
            {isLoading && !userMotto && mottos.length === 0 && !raffledMotto ? ( // Show loading only if we don't have userMotto yet and still fetching initial mottos, and raffle not yet shown
              <p className="text-xl text-yellow-200 animate-pulse">Checking your motto status...</p>
            ) : userMotto ? (
              <p className="text-xl text-pink-200">
                You submitted: <strong className="font-semibold">&quot;{userMotto.text}&quot;</strong>
                {!raffledMotto && (
                  <>
                    <br />
                    <span className="text-sm text-yellow-300">(Feel free to update it below!)</span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-xl text-yellow-300">
                {!raffledMotto 
                  ? "You haven't submitted a motto yet. Go for it!"
                  : "Motto submissions are now closed as the raffle has concluded."
                }
              </p>
            )}
          </div>
        )}
        {/* End of User's motto status message */}

        {error && (
          <p className="text-red-300 bg-red-800 bg-opacity-70 p-3 rounded-md mb-4 text-sm">
            API Error: {error}
          </p>
        )}

        {/* Raffle Section - NEW */}
        {loggedInUser && (
          <div className="my-8 p-6 rounded-xl w-full max-w-md mx-auto"> {/* MODIFIED: Removed background, blur, shadow */}
            <h3 className="text-2xl font-semibold mb-4 text-yellow-300">Party Raffle!</h3>
            {loggedInUser.toLowerCase() === 'antonia' && !raffledMotto && (
              <button
                onClick={handleStartRaffle}
                disabled={isRaffleLoading}
                className="px-6 py-3 mb-4 bg-yellow-400 text-purple-700 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors transform hover:scale-105 disabled:opacity-70 w-full" // Changed button style
              >
                {isRaffleLoading ? 'Raffling...' : 'Start The Grand Motto Raffle!'}
              </button>
            )}
            {raffleError && <p className="text-red-300 bg-red-800 bg-opacity-70 p-2 rounded-md text-sm mb-3">{raffleError}</p>}
            {raffledMotto ? (
              <div className="mt-6 flex flex-row items-center justify-center space-x-2 sm:space-x-4"> {/* MODIFIED: flex-row, justify-center, space-x */}
                <Image 
                  src="/chibi_speaker.svg" 
                  alt="Chibi with speaking hat" 
                  className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-lg flex-shrink-0" // Slightly smaller, ensure it doesn't shrink
                  width={144} // Added width (based on sm:w-36 which is 9rem = 144px)
                  height={144} // Added height (based on sm:h-36 which is 9rem = 144px)
                />
                <div className="relative bg-white text-black p-4 sm:p-5 rounded-2xl shadow-xl border-2 border-black max-w-xs w-full text-left sm:text-center"> {/* MODIFIED: rounded-2xl, border-2 border-black */}
                  {/* Left pointing triangle tail for the speech bubble */}
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 -left-4 w-0 h-0" // MODIFIED: Adjusted position due to border
                    style={{
                      borderTop: '12px solid transparent', // Increased size
                      borderBottom: '12px solid transparent', // Increased size
                      borderRight: '12px solid white', 
                      // Adding a border to the tail itself
                      position: 'absolute',
                      content: '""',
                    }}
                  ></div>
                  {/* Tail border - pseudo element trick */}
                  <div
                    className="absolute top-1/2 transform -translate-y-1/2 -left-[18px] w-0 h-0" // Positioned slightly behind the white tail
                    style={{
                      borderTop: '14px solid transparent', // Slightly larger for border effect
                      borderBottom: '14px solid transparent', // Slightly larger for border effect
                      borderRight: '14px solid black', // Black border for the tail
                    }}
                  ></div>
                  <p className="text-sm sm:text-base leading-relaxed font-medium"> {/* MODIFIED: Adjusted text styling slightly */}
                    Your party fit is going to be: <br />
                    <strong className="block text-lg sm:text-xl text-pink-600 my-1 sm:my-2 animate-pulse"> {/* Keep motto text color distinct */}
                      &quot;{raffledMotto}&quot;
                    </strong>
                    Go slay!
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-lg text-gray-200 mt-4">
                {loggedInUser.toLowerCase() === 'antonia' && !isRaffleLoading ? 'Click the button above to start the raffle and see your assigned motto!' : 'The raffle hasn\'t started yet, or your assigned motto will appear here once it\'s drawn!'}
              </p>
            )}
          </div>
        )}
        {/* End of Raffle Section */}

        {/* Conditionally render form based on raffledMotto state */}
        {!raffledMotto && (
          <form
            onSubmit={handleMottoSubmit}
            className="mb-12 flex flex-col items-center justify-center gap-4"
          >
            <input
              type="text"
              value={newMotto}
              onChange={(e) => setNewMotto(e.target.value)}
              placeholder={isEditing ? "Update your motto..." : "Enter your motto here..."}
              className="px-6 py-3 rounded-lg text-lg text-gray-800 w-full sm:w-96 focus:ring-4 focus:ring-yellow-400 transition-all duration-300 ease-in-out"
              required
              disabled={!loggedInUser || isLoading}
            />
            <button
              type="submit"
              disabled={!loggedInUser || isLoading}
              className="px-8 py-3 bg-yellow-400 text-purple-700 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors transform hover:scale-105 disabled:opacity-70"
            >
              {loggedInUser ? (isLoading ? 'Processing...' : (isEditing ? 'Update Motto' : 'Submit Motto')) : 'Login to Submit'}
            </button>
            {!loggedInUser && <p className="text-center text-yellow-300 text-sm mt-2">You must be logged in to submit a motto.</p>}
          </form>
        )}

        {submitted && !raffledMotto && ( // Also hide submission success message if raffle is done
          <p className="text-green-300 text-lg mb-4 animate-pulse">
            {isEditing ? 'Motto updated successfully!' : 'Motto submitted successfully!'}
          </p>
        )}

        <div className="mt-10 w-full max-w-2xl text-center px-4"> {/* Removed background, added text-center and padding */}
          <h3 className="text-2xl font-semibold mb-4">Total Mottos Submitted: {mottos.length}</h3>
          
          {isLoading && mottos.length === 0 && <p className="mt-4">Loading submitters...</p>}
          {!isLoading && error && mottos.length === 0 && <p className="text-red-300 mt-4">Could not load submitters: {error}</p>}

          {uniqueSubmitters.length > 0 ? (
            <div className="mt-6">
              <h4 className="text-xl font-medium mb-4">Awesome Submitters:</h4>
              <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2"> {/* Bubble container */}
                {uniqueSubmitters.map((name, index) => (
                  <div
                    key={index}
                    className="bg-slate-100 text-black px-3 py-1 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-150 ease-in-out animate-slideInUp"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !isLoading && !error && <p className="mt-6">No one has submitted a motto yet. Be the first!</p>
          )}
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center text-sm z-10">
        MottoParty App &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

// Basic CSS for animations (can be moved to a global CSS file)
// Add this to your globals.css or a relevant CSS file if you prefer
// For Tailwind, you might configure these in tailwind.config.js if more complex
// For simplicity, keeping it here as a comment or you can add a <style jsx global>
/*
@keyframes bounce {
  0%, 100% {
    transform: translateY(-5%);
    animation-timing-function: cubic-bezier(0.8,0,1,1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0,0,0.2,1);
  }
}
.animate-bounce {
  animation: bounce 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out forwards;
}
*/
