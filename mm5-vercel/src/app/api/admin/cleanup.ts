import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, Timestamp } from "firebase/firestore";

const INACTIVITY_TIMEOUT_MS = 90 * 60 * 1000; // 90 minutes

/**
 * Cleanup inactive/orphaned group sessions
 * Should be called periodically (e.g., every 15 minutes)
 * 
 * This endpoint:
 * 1. Identifies groups that haven't had activity for 90+ minutes
 * 2. Removes them from the game
 * 3. Cleans up their decision documents
 * 
 * Protected by API key verification (future enhancement)
 */
export async function POST(req: NextRequest) {
  try {
    // TODO: Add API key verification
    // const apiKey = req.headers.get("x-api-key");
    // if (apiKey !== process.env.CLEANUP_API_KEY) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const now = Date.now();
    const cleanupResult = {
      gamesProcessed: 0,
      groupsRemoved: 0,
      decisionsRemoved: 0,
      errors: [] as string[],
    };

    // Get all games
    const gamesRef = collection(db, "games");
    const gamesSnapshot = await getDocs(gamesRef);

    for (const gameDoc of gamesSnapshot.docs) {
      const gameId = gameDoc.id;
      const game = gameDoc.data();

      // Skip completed/finished games (optional - could keep them for archival)
      if (game.status === "finished") {
        continue;
      }

      cleanupResult.gamesProcessed++;

      try {
        // Get all groups in this game
        const groupsRef = collection(db, "games", gameId, "groups");
        const groupsSnapshot = await getDocs(groupsRef);

        for (const groupDoc of groupsSnapshot.docs) {
          const groupId = groupDoc.id;
          const group = groupDoc.data();

          // Check if group has been inactive for too long
          const lastActivityTime = group.lastActivityTime || group.joinedAt?.toMillis?.() || 0;
          const inactivityDuration = now - lastActivityTime;

          if (inactivityDuration > INACTIVITY_TIMEOUT_MS) {
            console.log(
              `[Cleanup] Removing inactive group ${group.name} (${groupId}) from game ${gameId}. Inactive for ${Math.round(inactivityDuration / 1000 / 60)} minutes`
            );

            // Delete the group document
            await deleteDoc(doc(db, "games", gameId, "groups", groupId));
            cleanupResult.groupsRemoved++;

            // Delete associated decision document if exists
            try {
              await deleteDoc(doc(db, "games", gameId, "decisions", groupId));
              cleanupResult.decisionsRemoved++;
            } catch (e) {
              // Decision might not exist, that's ok
            }

            // Update game's groups array to remove this group
            if (game.groups && Array.isArray(game.groups)) {
              const updatedGroups = game.groups.filter((g: string) => g !== groupId);
              await updateDoc(doc(db, "games", gameId), {
                groups: updatedGroups,
              });
            }
          }
        }
      } catch (error) {
        const errorMsg = `Error processing game ${gameId}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[Cleanup] ${errorMsg}`);
        cleanupResult.errors.push(errorMsg);
      }
    }

    console.log(`[Cleanup] Complete:`, cleanupResult);
    return NextResponse.json(cleanupResult);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Cleanup] Fatal error:`, errorMsg);
    return NextResponse.json({ error: errorMsg, success: false }, { status: 500 });
  }
}

/**
 * GET endpoint to check cleanup status
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication

    const gameIdParam = req.nextUrl.searchParams.get("gameId");

    if (!gameIdParam) {
      return NextResponse.json(
        { error: "gameId parameter required" },
        { status: 400 }
      );
    }

    // Get all groups for this game and their activity
    const groupsRef = collection(db, "games", gameIdParam, "groups");
    const groupsSnapshot = await getDocs(groupsRef);

    const now = Date.now();
    const groupStatus = groupsSnapshot.docs.map((doc) => {
      const group = doc.data();
      const lastActivityTime = group.lastActivityTime || group.joinedAt?.toMillis?.() || 0;
      const inactivityDuration = now - lastActivityTime;
      const willBeRemoved = inactivityDuration > INACTIVITY_TIMEOUT_MS;

      return {
        groupId: doc.id,
        name: group.name,
        lastActivityTime,
        inactivityMinutes: Math.round(inactivityDuration / 1000 / 60),
        willBeRemoved,
        joinedAt: group.joinedAt?.toMillis?.(),
      };
    });

    return NextResponse.json({
      gameId: gameIdParam,
      inactivityTimeoutMinutes: INACTIVITY_TIMEOUT_MS / 1000 / 60,
      groups: groupStatus,
      totalGroups: groupStatus.length,
      groupsToBeRemoved: groupStatus.filter((g) => g.willBeRemoved).length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Cleanup] Error in GET:`, errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
