import { PracticeTopic } from './types.js';

export const PRACTICE_TOPICS: PracticeTopic[] = [
  // --- BEGINNER ---
  {
    id: 'beg-intro-yourself',
    title: 'Self-Introduction (Giới thiệu bản thân)',
    vnTitle: 'Giới thiệu bản thân',
    description: 'Practice basic self-introduction containing name, age, hometown, job, and hobbies. Ideal for absolute beginners to build confidence.',
    vnDescription: 'Luyện tập giới thiệu bản thân cơ bản bao gồm tên, tuổi, quê quán, công việc và sở thích. Lý tưởng cho người mới bắt đầu xây dựng sự tự tin.',
    level: 'beginner',
    type: 'read-aloud',
    prompt: 'Introducing oneself in daily life. Hello, my name is Alex. I am twenty-five years old and I come from Vietnam. Currently, I work as an accountant. In my free time, I love playing badminton, reading books, and listening to pop music. Nice to meet you all.',
    suggestedPhrases: [
      { phrase: 'My name is...', meaning: 'Tên tôi là...' },
      { phrase: 'I am [age] years old', meaning: 'Tôi [số] tuổi' },
      { phrase: 'I come from...', meaning: 'Tôi đến từ...' },
      { phrase: 'In my free time, I love...', meaning: 'Trong thời gian rảnh, tôi thích...' },
      { phrase: 'Nice to meet you', meaning: 'Rất vui được gặp bạn' }
    ]
  },
  {
    id: 'beg-coffee-shop',
    title: 'Ordering a Drink (Gọi đồ uống tại quán cà phê)',
    vnTitle: 'Gọi đồ uống tại quán cà phê',
    description: 'Learn how to order a drink, choose the cup size, make customizations (ice/sugar level), and pay. Play the customer, AI acts as the barista.',
    vnDescription: 'Học cách gọi đồ uống, chọn size cốc, yêu cầu tùy chỉnh (lượng đá/đường) và thanh toán. Bạn đóng vai khách hàng, AI là nhân viên pha chế.',
    level: 'beginner',
    type: 'dialogue',
    context: 'You are at a local cafe in New York. The barista welcomes you and asks for your order.',
    prompt: 'You are a friendly barista in a cosy coffee shop. Greet the customer warmly and ask what they would like to drink. Continue the conversation naturally about drink sizes, sugar levels, ice preferences, and payment details.',
    suggestedPhrases: [
      { phrase: "I'd like to order a [drink], please.", meaning: 'Tôi muốn gọi một [đồ uống].' },
      { phrase: 'Could I have a medium size?', meaning: 'Cho tôi cốc cỡ vừa được không?' },
      { phrase: 'With less sugar and more ice, please.', meaning: 'Làm ơn cho ít đường và nhiều đá.' },
      { phrase: 'Can I pay by card/cash?', meaning: 'Tôi có thể thanh toán bằng thẻ/tiền mặt không?' },
      { phrase: 'Here is your drink.', meaning: 'Đồ uống của bạn đây.' }
    ],
    roles: {
      roleA: "Customer",
      roleB: "Barista",
      vnRoleA: "Khách hàng",
      vnRoleB: "Nhân viên pha chế"
    },
    dialogueScript: [
      {
        speaker: "Barista",
        text: "Hello! Warm welcome to the Daily Grind Coffee Shop. What can I brew for you today?",
        vnText: "Xin chào! Chào mừng bạn đến với Daily Grind Coffee Shop. Hôm nay tôi có thể pha gì cho bạn đây?",
        roleTag: "B"
      },
      {
        speaker: "Customer",
        text: "Hi! I would like to order a warm medium cappuccino with almond milk, please.",
        vnText: "Chào bạn! Tôi muốn gọi một tách cappuccino nóng cỡ vừa với sữa hạnh nhân nhé.",
        roleTag: "A"
      },
      {
        speaker: "Barista",
        text: "Excellent choice! Would you like that with normal sugar, or less sweet?",
        vnText: "Lựa chọn tuyệt vời! Bạn có muốn uống lượng đường bình thường hay ít ngọt?",
        roleTag: "B"
      },
      {
        speaker: "Customer",
        text: "Less sweet, please. Also, can I pay by contact-less card?",
        vnText: "Cho tôi ít ngọt nhé. Tiện thể tôi thanh toán bằng thẻ quẹt không tiếp xúc được không?",
        roleTag: "A"
      },
      {
        speaker: "Barista",
        text: "Yes, surely! Just tap your card on the terminal. Here is your warm cappuccino. Enjoy!",
        vnText: "Vâng, tất nhiên rồi! Bạn chỉ cần chạm thẻ vào máy thanh toán. Cappuccino nóng của bạn đây. Chúc ngon miệng!",
        roleTag: "B"
      }
    ]
  },
  {
    id: 'beg-daily-routine',
    title: 'Daily Habits & Routines (Thói quen hàng ngày)',
    vnTitle: 'Thói quen hàng ngày',
    description: 'Read aloud a short passage detailing a productive daily routine to master regular present tense and daily verbs.',
    vnDescription: 'Đọc to một đoạn văn ngắn chi tiết về thói quen hàng ngày lành mạnh để nắm vững thì hiện tại đơn và các động từ chỉ hoạt động thường nhật.',
    level: 'beginner',
    type: 'read-aloud',
    prompt: 'Every day, I wake up at six-thirty in the morning. First, I brush my teeth and wash my face. Then, I prepare a simple breakfast with eggs and milk. I leave for work at eight o’clock. After finishing work at five PM, I go to the gym or walk in the park. I usually go to bed before eleven o’clock.',
    suggestedPhrases: [
      { phrase: 'Every day, I wake up at...', meaning: 'Mỗi ngày, tôi thức dậy lúc...' },
      { phrase: 'First, I... Then, I...', meaning: 'Trước tiên tôi... Sau đó tôi...' },
      { phrase: 'I leave for work at...', meaning: 'Tôi đi làm lúc...' },
      { phrase: 'I usually go to bed...', meaning: 'Tôi thường đi ngủ...' }
    ]
  },

  // --- INTERMEDIATE ---
  {
    id: 'int-job-interview',
    title: 'Job Interview Practice (Phỏng vấn xin việc)',
    vnTitle: 'Mô phỏng phỏng vấn xin việc',
    description: 'An interactive simulator for job interview practice. Answer typical HR questions regarding background, strengths, and goals. AI acts as a professional recruiter.',
    vnDescription: 'Mô phỏng phỏng vấn xin việc tương tác. Trả lời các câu hỏi tuyển dụng điển hình về kinh nghiệm, điểm mạnh và mục tiêu. AI đóng vai nhà tuyển dụng chuyên nghiệp.',
    level: 'intermediate',
    type: 'roleplay',
    context: 'An interview room at a global technology company. The HR Director welcomes you and asks questions about your qualifications and why you are the best fit.',
    prompt: 'You are the HR Director of an innovative tech firm. Interview the candidate. Ask them to introduce themselves first, then follow up with questions on their major strengths, how they handle team conflicts, and why they want to join your company. Give constructive guidance through natural conversational turns.',
    suggestedPhrases: [
      { phrase: 'I have [X] years of experience in...', meaning: 'Tôi đã có [X] năm kinh nghiệm trong...' },
      { phrase: 'One of my greatest strengths is...', meaning: 'Một trong những điểm mạnh lớn nhất của tôi là...' },
      { phrase: 'I am highly passionate about your mission...', meaning: 'Tôi rất đam mê và tâm huyết với sứ mệnh của quý công ty...' },
      { phrase: 'In my previous position, I successfully...', meaning: 'Trong công việc trước đây, tôi đã thành công trong việc...' }
    ],
    roles: {
      roleA: "Candidate",
      roleB: "HR Director",
      vnRoleA: "Ứng cử viên",
      vnRoleB: "Giám đốc nhân sự"
    },
    dialogueScript: [
      {
        speaker: "HR Director",
        text: "Welcome to Google Technologies. To begin, could you please introduce yourself and walk me through your career history?",
        vnText: "Chào mừng bạn đến với Google Technologies. Đầu tiên, bạn có thể tự giới thiệu và sơ lược lịch sử sự nghiệp của mình không?",
        roleTag: "B"
      },
      {
        speaker: "Candidate",
        text: "Thank you. I have over three years of experience in front-end development, specifically specializing in React and responsive user interfaces.",
        vnText: "Cảm ơn người phỏng vấn. Tôi có hơn 3 năm kinh nghiệm lập trình giao diện, cụ thể chuyên sâu về React và thiết kế giao diện tương thích responsive.",
        roleTag: "A"
      },
      {
        speaker: "HR Director",
        text: "That sounds impressive! Can you share a concrete strength that helps you resolve high-pressure conflicts in teams?",
        vnText: "Nghe rất ấn tượng! Bạn có thể chia sẻ một điểm mạnh cụ thể nào giúp bạn giải quyết mâu thuẫn dưới áp lực cao trong nhóm không?",
        roleTag: "B"
      },
      {
        speaker: "Candidate",
        text: "One of my greatest strengths is empathetic communication. I always listen to each peer's perspective first to identify a cooperative win-win roadmap.",
        vnText: "Một trong những điểm mạnh lớn nhất của tôi là giao tiếp đồng cảm. Tôi luôn lắng nghe góc nhìn của đồng nghiệp trước để tìm ra hướng hợp tác đôi bên cùng có lợi.",
        roleTag: "A"
      },
      {
        speaker: "HR Director",
        text: "Thank you for sharing. We value such collaborative mindsets here. We will get in touch with you shortly, have a great day!",
        vnText: "Cảm ơn bạn đã chia sẻ. Chúng tôi đánh giá rất cao tinh thần hợp tác thấu hiểu đó. Chúng tôi sẽ sớm liên hệ lại với bạn, chúc một ngày tốt lành!",
        roleTag: "B"
      }
    ]
  },
  {
    id: 'int-describe-vacation',
    title: 'Describe Your Best Vacation (Kể về kỳ nghỉ đáng nhớ)',
    vnTitle: 'Kể về kỳ nghỉ đáng nhớ nhất',
    description: 'Describe details about a past school or business holiday trip, expressing what you visited, the food you ate, and why it is unforgettable.',
    vnDescription: 'Mô tả chi tiết về một kỳ nghỉ trong quá khứ, giải thích các địa điểm tham quan, món ăn đã thử và vì sao kỳ nghỉ đó không thể nào quên.',
    level: 'intermediate',
    type: 'dialogue',
    context: 'A friendly catch-up with an old friend. Your friend is asking about your recent travel and wants recommendations.',
    prompt: 'You are a warm, curious friend catching up over lunch. Ask your friend (the user) about their last vacation in detail: Where did they go? What did they do? How was the local cuisine? Share short supportive remarks and ask engaging follow-ups to expand their speech.',
    suggestedPhrases: [
      { phrase: 'It was an unforgettable experience because...', meaning: 'Đó là một trải nghiệm không thể nào quên bởi vì...' },
      { phrase: 'The scenery was absolutely breathtaking.', meaning: 'Phong cảnh đẹp đến nghẹt thở.' },
      { phrase: 'We had a chance to try local delicacies.', meaning: 'Chúng tôi đã có cơ hội thưởng thức các món ăn đặc sản địa phương.' },
      { phrase: 'If I had another chance, I would definitely return to...', meaning: 'Nếu có cơ hội khác, tôi chắc chắn sẽ quay lại...' }
    ]
  },

  // --- ADVANCED ---
  {
    id: 'adv-ielts-p2-influential',
    title: 'IELTS Speaking Part 2 - An Influential Family Member (Người thân có sức ảnh hưởng)',
    vnTitle: 'IELTS Speaking Part 2 - Người thân có sức ảnh hưởng',
    description: 'Complete formal training for IELTS Speaking. You have up to 2 minutes to present. AI generates detailed score matching standard IELTS descriptors.',
    vnDescription: 'Hoàn thành bài luyện tập thi IELTS Speaking Part 2. Bạn có tối đa 2 phút trình bày. AI tính điểm chi tiết khớp với các tiêu chí chấm điểm IELTS chuẩn.',
    level: 'advanced',
    type: 'ielts',
    ieltsPart: 2,
    prompt: `Describe a family member who has had an important influence on you.
You should say:
- Who this person is
- What kind of person they are
- What you did together
And explain how this person has influenced or shaped your character.`,
    suggestedPhrases: [
      { phrase: 'When it comes to individuals who have left an indelible imprint on my life...', meaning: 'Khi nói đến những người đã để lại dấu ấn không phai mờ trong đời tôi...' },
      { phrase: 'He/She is a paragon of virtue and perseverance.', meaning: 'Ông/Bà ấy là một tấm gương sáng về đức hạnh và sự kiên trì.' },
      { phrase: 'Through his/her wisdom and mentorship, I have developed...', meaning: 'Nhờ trí tuệ và sự dạy dỗ chỉ bảo của ông/bà ấy, tôi đã phát triển...' },
      { phrase: 'I always hold him/her in the highest esteem.', meaning: 'Tôi luôn kính trọng ông/bà ấy ở mức cao nhất.' }
    ]
  },
  {
    id: 'adv-debate-ai',
    title: 'AI in Education Debate (Tranh biện: Trí tuệ nhân tạo trong giáo dục)',
    vnTitle: 'Tranh biện: Trí tuệ nhân tạo trong giáo dục',
    description: 'Engage in an intellectual debate. The AI argues that AI tutoring makes traditional classrooms obsolete. Defend human teachers or build a integrated stance.',
    vnDescription: 'Tham gia tranh biện học thuật. AI lập luận rằng gia sư AI khiến lớp học truyền thống trở nên lỗi thời. Hãy bảo vệ vai trò của giáo viên hoặc nêu quan điểm dung hòa.',
    level: 'advanced',
    type: 'debate',
    context: 'A formal debating stage. AI acts as your opponent holding the motion: "AI will fully replace human teachers in the foreseeable future."',
    prompt: 'You are a sharp, articulate academic debate opponent. Defend the motion that specialized AI tutors provide far more effective, direct personalized training than any physical human school system can offer. Present complex structures, counter any simple point raised by the user, and challenge their coherence, logical flow, and use of advanced vocabulary.',
    suggestedPhrases: [
      { phrase: 'With all due respect, I must respectfully disagree with your core premise...', meaning: 'Với tất cả sự tôn trọng, tôi xin phép không đồng tình với tiền đề cốt lõi của bạn...' },
      { phrase: 'AI is capable of tailor-made curriculum with unparalleled efficiency, yet it lacks...', meaning: 'AI có khả năng thiết kế giáo trình riêng với hiệu suất vô song, song nó lại thiếu...' },
      { phrase: 'But in truth, classrooms foster peer interaction and indispensable socio-emotional skills.', meaning: 'Nhưng trên thực tế, lớp học nuôi dưỡng sự tương tác giữa những người đồng trang lứa và các kỹ năng cảm xúc xã hội thiết yếu.' },
      { phrase: 'This technology acts as a catalyst rather than a complete substitute.', meaning: 'Công nghệ này đóng vai trò là một chất xúc tác hơn là một sự thay thế hoàn toàn.' }
    ]
  },
  {
    id: 'adv-ielts-p3-technology',
    title: 'IELTS Speaking Part 3 - Modern Social Dynamics (Xã hội và Công nghệ hiện đại)',
    vnTitle: 'IELTS Speaking Part 3 - Động lực xã hội và Công nghệ',
    description: 'Participate in abstract discussions of IELTS Part 3 relative to technology, virtual communities, and human isolation. Essential for IELTS Band 7.5+.',
    vnDescription: 'Thảo luận các chủ đề trừu tượng trong IELTS Speaking Part 3 liên quan đến công nghệ, cộng đồng ảo và sự cô lập của con người. Cần thiết cho mục tiêu Band 7.5+.',
    level: 'advanced',
    type: 'ielts',
    ieltsPart: 3,
    prompt: 'You are a senior IELTS examiner. Ask abstract, analytical follow-up questions linked to modern communication. Topics: Does online social networking reduce the quality of real-life intimacy? Will future generations communicate solely via virtual platforms? Push the candidate to express philosophical, multi-layered responses.',
    suggestedPhrases: [
      { phrase: 'There is an undeniable correlation between screen time and social alienation.', meaning: 'Có một mối tương quan không thể phủ nhận giữa thời gian sử dụng màn hình và sự xa lánh xã hội.' },
      { phrase: 'While virtual platforms bridge geological chasms, they erode...', meaning: 'Dù các nền tảng ảo kết nối các vực thẳm địa lý, chúng lại xói mòn...' },
      { phrase: 'Under no circumstances should we rely purely on digitized mediums.', meaning: 'Trong bất kỳ hoàn cảnh nào chúng ta cũng không nên phụ thuộc hoàn toàn vào các phương tiện kỹ thuật số.' },
      { phrase: 'It is a double-edged sword which deserves critical examination.', meaning: 'Đó là một con dao hai lưỡi xứng đáng được xem xét một cách nghiêm túc.' }
    ]
  }
];
